import { createHmac } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { AppConfig } from "../../config";
import { SocketAlertWebhookPayload } from "../../types/socketWebhook";

/**
 * Shared test signing secret. Use the same value in local.settings.json for manual fixture POSTs.
 * Format matches Socket.dev / Standard Webhooks (whsec_ + base64 key material).
 */
export const TEST_WEBHOOK_SECRET =
  "whsec_" + Buffer.from("test-signing-key-24bytes!!").toString("base64");

export function signWebhookPayload(
  rawBody: string,
  secret: string = TEST_WEBHOOK_SECRET,
  timestamp: number = Math.floor(Date.now() / 1000),
): string {
  const encoded = secret.startsWith("whsec_") ? secret.slice("whsec_".length) : secret;
  const key = Buffer.from(encoded, "base64");
  const signature = createHmac("sha256", key).update(`${timestamp}.${rawBody}`, "utf8").digest("base64");
  return `t=${timestamp},s=${signature}`;
}

export function testAppConfig(overrides: Partial<AppConfig> = {}): AppConfig {
  return {
    webhookSecret: TEST_WEBHOOK_SECRET,
    mailSenderUpn: "socket-alerts@c3.ai",
    mailToAddresses: ["dependency-security@c3.ai"],
    minSeverity: "low",
    includeCleared: true,
    repoAllowlist: [],
    idempotencyTableName: "SocketWebhookEvents",
    signatureMaxAgeSeconds: 300,
    storageConnectionString: "UseDevelopmentStorage=true",
    ...overrides,
  };
}

const FIXTURES_DIR = join(__dirname, "..", "fixtures");

export type FixtureName = "alert-created" | "alert-updated" | "alert-cleared";

export function loadFixture(name: FixtureName): SocketAlertWebhookPayload {
  const raw = readFileSync(join(FIXTURES_DIR, `${name}.json`), "utf8");
  return JSON.parse(raw) as SocketAlertWebhookPayload;
}

export function fixtureRawBody(name: FixtureName): string {
  return readFileSync(join(FIXTURES_DIR, `${name}.json`), "utf8");
}

export function signedFixtureRequest(name: FixtureName): {
  rawBody: string;
  signatureHeader: string;
  payload: SocketAlertWebhookPayload;
} {
  const rawBody = fixtureRawBody(name);
  return {
    rawBody,
    signatureHeader: signWebhookPayload(rawBody),
    payload: JSON.parse(rawBody) as SocketAlertWebhookPayload,
  };
}
