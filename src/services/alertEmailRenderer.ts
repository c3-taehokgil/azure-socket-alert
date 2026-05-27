import { AppConfig, titleCaseSeverity } from "../config";
import { AlertNotification, SocketAlert, SocketAlertEventType } from "../types/socketAlert";

export interface RenderedEmail {
  subject: string;
  htmlBody: string;
  textBody: string;
  importance: "low" | "normal" | "high";
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function repoLabel(alert: SocketAlert, organizationSlug?: string): string {
  const location = alert.locations?.[0];
  return location?.repoSlug ?? location?.repo ?? organizationSlug ?? "unknown";
}

function dependencyLabel(alert: SocketAlert): string {
  const location = alert.locations?.[0];
  return location?.dependency ?? alert.type ?? "";
}

function fixLabel(alert: SocketAlert): string {
  if (!alert.fix) {
    return "";
  }
  if (typeof alert.fix === "string") {
    return alert.fix;
  }
  return alert.fix.description ?? alert.fix.type ?? "";
}

function graphImportance(eventType: SocketAlertEventType, severity: string | undefined): "low" | "normal" | "high" {
  if (eventType === "alert:cleared") {
    return "low";
  }
  const s = (severity ?? "low").toLowerCase();
  if (s === "critical" || s === "high") {
    return "high";
  }
  if (s === "medium") {
    return "normal";
  }
  return "low";
}

function severityColor(severity: string | undefined, eventType: SocketAlertEventType): string {
  if (eventType === "alert:cleared") {
    return "#16a34a";
  }
  switch ((severity ?? "low").toLowerCase()) {
    case "critical":
      return "#dc2626";
    case "high":
      return "#ea580c";
    case "medium":
      return "#ca8a04";
    default:
      return "#64748b";
  }
}

function buildSubject(notification: AlertNotification): string {
  const alert = notification.alert;
  const severity = titleCaseSeverity(alert.severity);
  const title = alert.title ?? "Socket alert";
  const orgRepo = repoLabel(alert, notification.organizationSlug);

  switch (notification.eventType) {
    case "alert:created":
      return `[Socket ${severity}] ${title} — ${orgRepo}`;
    case "alert:updated":
      return `[Socket Updated/${severity}] ${title} — ${orgRepo}`;
    case "alert:cleared":
      return `[Socket Cleared] ${title} — ${orgRepo}`;
    default:
      return `[Socket] ${title} — ${orgRepo}`;
  }
}

function buildDetailRows(alert: SocketAlert): string {
  const rows: string[] = [];
  const location = alert.locations?.[0];

  if (alert.description) {
    rows.push(`<tr><th align="left">Description</th><td>${escapeHtml(alert.description)}</td></tr>`);
  }
  if (location?.manifestFile) {
    rows.push(`<tr><th align="left">Manifest</th><td>${escapeHtml(location.manifestFile)}</td></tr>`);
  }
  if (location?.action) {
    rows.push(`<tr><th align="left">Action</th><td>${escapeHtml(location.action)}</td></tr>`);
  }
  if (alert.vulnerability?.cveId) {
    rows.push(`<tr><th align="left">CVE</th><td>${escapeHtml(alert.vulnerability.cveId)}</td></tr>`);
  }
  if (alert.vulnerability?.cvssScore != null) {
    rows.push(`<tr><th align="left">CVSS</th><td>${escapeHtml(String(alert.vulnerability.cvssScore))}</td></tr>`);
  }
  if (alert.vulnerability?.isKev) {
    rows.push(`<tr><th align="left">KEV</th><td>Yes</td></tr>`);
  }
  const fix = fixLabel(alert);
  if (fix) {
    rows.push(`<tr><th align="left">Fix</th><td>${escapeHtml(fix)}</td></tr>`);
  }

  return rows.join("");
}

export function renderAlertEmail(notification: AlertNotification, _config: AppConfig): RenderedEmail {
  const alert = notification.alert;
  const severity = titleCaseSeverity(alert.severity);
  const category = alert.category ?? alert.type ?? "alert";
  const repo = repoLabel(alert, notification.organizationSlug);
  const dependency = dependencyLabel(alert);
  const dashboardUrl = alert.dashboardUrl ?? "";
  const headerColor = severityColor(alert.severity, notification.eventType);

  const subject = buildSubject(notification);
  const importance = graphImportance(notification.eventType, alert.severity);

  const htmlBody = `<!DOCTYPE html>
<html>
<body style="font-family: Segoe UI, Arial, sans-serif; color: #111827;">
  <div style="border-left: 6px solid ${headerColor}; padding: 12px 16px; background: #f8fafc; margin-bottom: 16px;">
    <h2 style="margin: 0 0 4px 0;">Socket Security Alert</h2>
    <p style="margin: 0; color: #475569;">${escapeHtml(notification.eventType)} · ${escapeHtml(severity)}</p>
  </div>
  <table style="border-collapse: collapse; width: 100%; margin-bottom: 16px;" border="1" cellpadding="8">
    <thead style="background: #e2e8f0;">
      <tr>
        <th>Severity</th>
        <th>Category</th>
        <th>Alert</th>
        <th>Repository</th>
        <th>Dependency</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td>${escapeHtml(severity)}</td>
        <td>${escapeHtml(category)}</td>
        <td>${escapeHtml(alert.title ?? "Untitled alert")}</td>
        <td>${escapeHtml(repo)}</td>
        <td>${escapeHtml(dependency)}</td>
      </tr>
    </tbody>
  </table>
  <table style="border-collapse: collapse; width: 100%; margin-bottom: 16px;" border="1" cellpadding="8">
    ${buildDetailRows(alert)}
  </table>
  ${
    dashboardUrl
      ? `<p><a href="${escapeHtml(dashboardUrl)}">View in Socket Dashboard</a></p>`
      : ""
  }
  <hr />
  <p style="font-size: 12px; color: #64748b;">
    Alert ID: ${escapeHtml(String(alert.id ?? "unknown"))} · v${escapeHtml(String(alert.version ?? 0))} · ${escapeHtml(notification.timestamp)} UTC · Automated message — do not reply
  </p>
</body>
</html>`;

  const textBody = [
    `Socket Security Alert (${notification.eventType})`,
    `Severity: ${severity}`,
    `Title: ${alert.title ?? "Untitled alert"}`,
    `Repository: ${repo}`,
    `Dependency: ${dependency}`,
    alert.description ? `Description: ${alert.description}` : "",
    dashboardUrl ? `Dashboard: ${dashboardUrl}` : "",
    `Alert ID: ${alert.id ?? "unknown"} (v${alert.version ?? 0})`,
  ]
    .filter(Boolean)
    .join("\n");

  return { subject, htmlBody, textBody, importance };
}
