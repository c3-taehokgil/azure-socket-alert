export type Severity = "low" | "medium" | "high" | "critical";

const SEVERITY_RANK: Record<Severity, number> = {
  low: 1,
  medium: 2,
  high: 3,
  critical: 4,
};

export interface AppConfig {
  webhookSecret: string;
  mailSenderUpn: string;
  mailToAddresses: string[];
  mailReplyTo?: string;
  socketOrgSlug?: string;
  minSeverity: Severity;
  includeCleared: boolean;
  repoAllowlist: string[];
  idempotencyTableName: string;
  signatureMaxAgeSeconds: number;
  storageConnectionString: string;
}

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value?.trim()) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value.trim();
}

function parseSeverity(value: string | undefined, fallback: Severity): Severity {
  const normalized = (value ?? fallback).toLowerCase();
  if (normalized === "low" || normalized === "medium" || normalized === "high" || normalized === "critical") {
    return normalized;
  }
  throw new Error(`Invalid MIN_SEVERITY: ${value}`);
}

export function loadConfig(): AppConfig {
  const includeCleared = (process.env.INCLUDE_CLEARED ?? "true").toLowerCase() !== "false";
  const repoAllowlist = (process.env.REPO_ALLOWLIST ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  const mailTo = requireEnv("MAIL_TO_ADDRESSES")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  if (mailTo.length === 0) {
    throw new Error("MAIL_TO_ADDRESSES must contain at least one address");
  }

  const orgSlug = process.env.SOCKET_ORG_SLUG?.trim();
  const replyTo = process.env.MAIL_REPLY_TO?.trim();

  return {
    webhookSecret: requireEnv("SOCKET_WEBHOOK_SECRET"),
    mailSenderUpn: requireEnv("MAIL_SENDER_UPN"),
    mailToAddresses: mailTo,
    mailReplyTo: replyTo || undefined,
    socketOrgSlug: orgSlug || undefined,
    minSeverity: parseSeverity(process.env.MIN_SEVERITY, "low"),
    includeCleared,
    repoAllowlist,
    idempotencyTableName: process.env.IDEMPOTENCY_TABLE_NAME?.trim() || "SocketWebhookEvents",
    signatureMaxAgeSeconds: Number(process.env.SIGNATURE_MAX_AGE_SECONDS ?? "300"),
    storageConnectionString: requireEnv("AzureWebJobsStorage"),
  };
}

export function meetsMinSeverity(severity: string | undefined, minSeverity: Severity): boolean {
  const normalized = (severity ?? "low").toLowerCase() as Severity;
  const rank = SEVERITY_RANK[normalized] ?? SEVERITY_RANK.low;
  return rank >= SEVERITY_RANK[minSeverity];
}

export function titleCaseSeverity(severity: string | undefined): string {
  const s = (severity ?? "low").toLowerCase();
  return s.charAt(0).toUpperCase() + s.slice(1);
}
