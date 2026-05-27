import { AppConfig, loadConfig, meetsMinSeverity } from "../config";
import { AlertNotification, SocketAlert, SocketAlertEventType } from "../types/socketAlert";
import { renderAlertEmail } from "./alertEmailRenderer";
import { sendAlertEmail } from "./graphMailSender";
import { NotificationStateStore } from "./notificationStateStore";
import { listAllAlerts } from "./socketApiClient";

export type PollItemResult =
  | { status: "sent"; alertId: string; version: number; eventType: SocketAlertEventType }
  | { status: "duplicate"; alertId: string; version: number }
  | { status: "skipped"; alertId?: string; reason: string };

export interface PollRunResult {
  polledAt: string;
  bootstrapped: boolean;
  alertsFetched: number;
  sent: number;
  duplicates: number;
  skipped: number;
  items: PollItemResult[];
}

function toUtcTimestamp(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())} ${pad(date.getUTCHours())}:${pad(date.getUTCMinutes())}:${pad(date.getUTCSeconds())}`;
}

function notificationKey(alertId: string, version: number): string {
  return `${alertId}:v${version}`;
}

export function inferEventType(alert: SocketAlert, previousVersion?: number): SocketAlertEventType {
  if (alert.status === "cleared") {
    return "alert:cleared";
  }
  if (previousVersion == null || previousVersion === 0) {
    return "alert:created";
  }
  return "alert:updated";
}

export function buildNotification(
  alert: SocketAlert,
  eventType: SocketAlertEventType,
  organizationSlug: string,
): AlertNotification {
  const alertId = alert.id ?? "unknown";
  const version = alert.version ?? 0;
  return {
    eventType,
    alert,
    organizationSlug,
    notificationId: notificationKey(alertId, version),
    timestamp: alert.updatedAt ?? alert.createdAt ?? new Date().toISOString(),
  };
}

export class AlertPoller {
  private readonly config: AppConfig;
  private readonly state: NotificationStateStore;

  constructor(config?: AppConfig) {
    this.config = config ?? loadConfig();
    this.state = new NotificationStateStore(
      this.config.storageConnectionString,
      this.config.stateTableName,
    );
  }

  async poll(now: Date = new Date()): Promise<PollRunResult> {
    const polledAt = now.toISOString();
    const lastPollAt = await this.state.getLastPollAt();

    if (!lastPollAt) {
      await this.state.setLastPollAt(polledAt);
      return {
        polledAt,
        bootstrapped: true,
        alertsFetched: 0,
        sent: 0,
        duplicates: 0,
        skipped: 0,
        items: [],
      };
    }

    const overlapMs = 60_000;
    const since = new Date(new Date(lastPollAt).getTime() - overlapMs);
    const updatedSince = toUtcTimestamp(since);

    const alerts = await listAllAlerts({
      orgSlug: this.config.socketOrgSlug,
      apiToken: this.config.socketApiToken,
      baseUrl: this.config.socketApiBaseUrl,
      updatedSince,
    });

    const items: PollItemResult[] = [];
    let sent = 0;
    let duplicates = 0;
    let skipped = 0;

    for (const alert of alerts) {
      const item = await this.processAlert(alert);
      items.push(item);
      if (item.status === "sent") {
        sent += 1;
      } else if (item.status === "duplicate") {
        duplicates += 1;
      } else {
        skipped += 1;
      }
    }

    await this.state.setLastPollAt(polledAt);

    return {
      polledAt,
      bootstrapped: false,
      alertsFetched: alerts.length,
      sent,
      duplicates,
      skipped,
      items,
    };
  }

  async processAlert(alert: SocketAlert): Promise<PollItemResult> {
    const alertId = alert.id;
    const version = alert.version ?? 0;

    if (!alertId) {
      return { status: "skipped", reason: "Missing alert id" };
    }

    const key = notificationKey(alertId, version);

    if (alert.status === "cleared" && !this.config.includeCleared) {
      return { status: "skipped", alertId, reason: "Cleared alerts disabled" };
    }

    if (!meetsMinSeverity(alert.severity, this.config.minSeverity)) {
      return { status: "skipped", alertId, reason: "Below MIN_SEVERITY" };
    }

    if (this.config.repoAllowlist.length > 0) {
      const repoSlug = alert.locations?.[0]?.repoSlug ?? alert.locations?.[0]?.repo ?? "";
      if (!this.config.repoAllowlist.includes(repoSlug)) {
        return { status: "skipped", alertId, reason: "Repo not in allowlist" };
      }
    }

    if (await this.state.hasNotified(key)) {
      return { status: "duplicate", alertId, version };
    }

    const previousVersion = await this.state.getLastNotifiedVersion(alertId);
    const eventType = inferEventType(alert, previousVersion);
    const notification = buildNotification(alert, eventType, this.config.socketOrgSlug);

    const email = renderAlertEmail(notification, this.config);
    await sendAlertEmail(this.config, email);
    await this.state.markNotified(key, alertId, version, eventType);

    return { status: "sent", alertId, version, eventType };
  }
}
