import { AppConfig, titleCaseSeverity } from "../config";
import { SocketAlert, SocketAlertEventType, SocketAlertWebhookPayload } from "../types/socketWebhook";

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
  const repo = location?.repoSlug ?? location?.repo ?? organizationSlug ?? "unknown";
  return repo;
}

function dependencyLabel(alert: SocketAlert): string {
  const location = alert.locations?.[0];
  return location?.dependency ?? alert.type ?? "";
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

function buildSubject(payload: SocketAlertWebhookPayload, alert: SocketAlert): string {
  const severity = titleCaseSeverity(alert.severity);
  const title = alert.title ?? "Socket alert";
  const orgRepo = repoLabel(alert, payload.data?.organization?.slug);

  switch (payload.type) {
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
    rows.push(`<tr><td><strong>Description</strong></td><td>${escapeHtml(alert.description)}</td></tr>`);
  }

  if (alert.vulnerability?.cveId) {
    const kev = alert.vulnerability.isKev ? "Yes" : "No";
    const cvss = alert.vulnerability.cvssScore ?? "n/a";
    rows.push(
      `<tr><td><strong>CVE</strong></td><td>${escapeHtml(alert.vulnerability.cveId)} — CVSS ${cvss}, KEV: ${kev}</td></tr>`,
    );
  }

  if (location?.manifestFile || location?.dependency) {
    rows.push(
      `<tr><td><strong>Location</strong></td><td>${escapeHtml(location.manifestFile ?? "")} → ${escapeHtml(location.dependency ?? "")}</td></tr>`,
    );
  }

  if (location?.action) {
    rows.push(`<tr><td><strong>Policy action</strong></td><td>${escapeHtml(location.action)}</td></tr>`);
  }

  if (alert.fix) {
    rows.push(`<tr><td><strong>Fix</strong></td><td>${escapeHtml(alert.fix)}</td></tr>`);
  }

  return rows.join("");
}

export function renderAlertEmail(payload: SocketAlertWebhookPayload, _config: AppConfig): RenderedEmail {
  const alert = payload.data?.alert ?? {};
  const eventId = payload.eventId ?? alert.eventId ?? alert.id ?? "unknown";
  const severity = titleCaseSeverity(alert.severity);
  const category = alert.category ?? alert.type ?? "alert";
  const repo = repoLabel(alert, payload.data?.organization?.slug);
  const dependency = dependencyLabel(alert);
  const dashboardUrl = alert.dashboardUrl ?? "";
  const headerColor = severityColor(alert.severity, payload.type);

  const subject = buildSubject(payload, alert);
  const importance = graphImportance(payload.type, alert.severity);

  const htmlBody = `<!DOCTYPE html>
<html>
<body style="font-family: Segoe UI, Arial, sans-serif; color: #111827;">
  <div style="border-left: 6px solid ${headerColor}; padding: 12px 16px; background: #f8fafc; margin-bottom: 16px;">
    <h2 style="margin: 0 0 4px 0;">Socket Security Alert</h2>
    <p style="margin: 0; color: #475569;">${escapeHtml(payload.type)} · ${escapeHtml(severity)}</p>
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
    Event ID: ${escapeHtml(String(eventId))} · ${escapeHtml(payload.timestamp ?? new Date().toISOString())} UTC · Automated message — do not reply
  </p>
</body>
</html>`;

  const textBody = [
    `Socket Security Alert (${payload.type})`,
    `Severity: ${severity}`,
    `Title: ${alert.title ?? "Untitled alert"}`,
    `Repository: ${repo}`,
    `Dependency: ${dependency}`,
    alert.description ? `Description: ${alert.description}` : "",
    dashboardUrl ? `Dashboard: ${dashboardUrl}` : "",
    `Event ID: ${eventId}`,
  ]
    .filter(Boolean)
    .join("\n");

  return { subject, htmlBody, textBody, importance };
}
