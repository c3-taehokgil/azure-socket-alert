import { AppConfig, loadConfig, meetsMinSeverity } from "../config";
import { SocketAlertEventType, SocketAlertWebhookPayload } from "../types/socketWebhook";
import { renderAlertEmail } from "./alertEmailRenderer";
import { sendAlertEmail } from "./graphMailSender";
import { IdempotencyStore } from "./idempotencyStore";
import { verifyWebhookSignature, WebhookSignatureError } from "./webhookSignatureValidator";

const SUPPORTED_EVENTS = new Set<SocketAlertEventType>([
  "alert:created",
  "alert:updated",
  "alert:cleared",
]);

export type ProcessResult =
  | { status: "sent"; eventId: string }
  | { status: "duplicate"; eventId: string }
  | { status: "skipped"; reason: string; eventId?: string }
  | { status: "ignored"; reason: string };

export class WebhookProcessor {
  private readonly config: AppConfig;
  private readonly idempotency: IdempotencyStore;

  constructor(config?: AppConfig) {
    this.config = config ?? loadConfig();
    this.idempotency = new IdempotencyStore(
      this.config.storageConnectionString,
      this.config.idempotencyTableName,
    );
  }

  async process(rawBody: string, signatureHeader: string | undefined): Promise<ProcessResult> {
    verifyWebhookSignature(
      rawBody,
      signatureHeader,
      this.config.webhookSecret,
      this.config.signatureMaxAgeSeconds,
    );

    let payload: SocketAlertWebhookPayload;
    try {
      payload = JSON.parse(rawBody) as SocketAlertWebhookPayload;
    } catch {
      throw new WebhookSignatureError("Invalid JSON payload");
    }

    if (!payload.type || !SUPPORTED_EVENTS.has(payload.type)) {
      return { status: "ignored", reason: `Unsupported event type: ${payload.type ?? "unknown"}` };
    }

    const alert = payload.data?.alert;
    const eventId = payload.eventId ?? alert?.eventId ?? alert?.id;
    if (!eventId) {
      return { status: "skipped", reason: "Missing event id" };
    }

    if (this.config.socketOrgSlug) {
      const orgSlug = payload.data?.organization?.slug;
      if (orgSlug && orgSlug !== this.config.socketOrgSlug) {
        return { status: "skipped", reason: "Organization slug mismatch", eventId };
      }
    }

    if (payload.type === "alert:cleared" && !this.config.includeCleared) {
      return { status: "skipped", reason: "Cleared alerts disabled", eventId };
    }

    if (!meetsMinSeverity(alert?.severity, this.config.minSeverity)) {
      return { status: "skipped", reason: "Below MIN_SEVERITY", eventId };
    }

    if (this.config.repoAllowlist.length > 0) {
      const repoSlug = alert?.locations?.[0]?.repoSlug ?? alert?.locations?.[0]?.repo ?? "";
      if (!this.config.repoAllowlist.includes(repoSlug)) {
        return { status: "skipped", reason: "Repo not in allowlist", eventId };
      }
    }

    if (await this.idempotency.hasProcessed(eventId)) {
      return { status: "duplicate", eventId };
    }

    const email = renderAlertEmail(payload, this.config);
    await sendAlertEmail(this.config, email);
    await this.idempotency.markProcessed(eventId, payload.type);

    return { status: "sent", eventId };
  }
}
