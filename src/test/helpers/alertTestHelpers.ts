import { readFileSync } from "node:fs";
import { join } from "node:path";
import { AppConfig } from "../../config";
import { AlertNotification, SocketAlert, SocketAlertEventType } from "../../types/socketAlert";
import { buildNotification } from "../../services/alertPoller";

export function testAppConfig(overrides: Partial<AppConfig> = {}): AppConfig {
  return {
    socketApiToken: "test-socket-api-token",
    socketOrgSlug: "c3-ai",
    socketApiBaseUrl: "https://api.socket.dev/v0",
    mailSenderUpn: "socket-alerts@c3.ai",
    mailToAddresses: ["dependency-security@c3.ai"],
    minSeverity: "low",
    includeCleared: true,
    repoAllowlist: [],
    stateTableName: "SocketAlertState",
    storageConnectionString: "UseDevelopmentStorage=true",
    ...overrides,
  };
}

const FIXTURES_DIR = join(__dirname, "..", "fixtures");

export type FixtureName = "alert-created" | "alert-updated" | "alert-cleared";

export function loadAlertFixture(name: FixtureName): SocketAlert {
  const raw = readFileSync(join(FIXTURES_DIR, `${name}.json`), "utf8");
  return JSON.parse(raw) as SocketAlert;
}

export function fixtureNotification(
  name: FixtureName,
  eventType?: SocketAlertEventType,
  orgSlug = "c3-ai",
): AlertNotification {
  const alert = loadAlertFixture(name);
  const inferred =
    eventType ??
    (name === "alert-cleared" ? "alert:cleared" : name === "alert-updated" ? "alert:updated" : "alert:created");
  return buildNotification(alert, inferred, orgSlug);
}
