export type Severity = "low" | "medium" | "high" | "critical";

const SEVERITY_RANK: Record<Severity, number> = {
  low: 1,
  medium: 2,
  high: 3,
  critical: 4,
};

export interface AppConfig {
  socketApiToken: string;
  socketOrgSlug: string;
  socketApiBaseUrl: string;
  mailSenderUpn: string;
  mailToAddresses: string[];
  mailReplyTo?: string;
  minSeverity: Severity;
  includeCleared: boolean;
  repoAllowlist: string[];
  stateTableName: string;
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

  const replyTo = process.env.MAIL_REPLY_TO?.trim();

  return {
    socketApiToken: requireEnv("SOCKET_API_TOKEN"),
    socketOrgSlug: requireEnv("SOCKET_ORG_SLUG"),
    socketApiBaseUrl: (process.env.SOCKET_API_BASE_URL ?? "https://api.socket.dev/v0").replace(/\/$/, ""),
    mailSenderUpn: requireEnv("MAIL_SENDER_UPN"),
    mailToAddresses: mailTo,
    mailReplyTo: replyTo || undefined,
    minSeverity: parseSeverity(process.env.MIN_SEVERITY, "low"),
    includeCleared,
    repoAllowlist,
    stateTableName: process.env.STATE_TABLE_NAME?.trim() || "SocketAlertState",
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
