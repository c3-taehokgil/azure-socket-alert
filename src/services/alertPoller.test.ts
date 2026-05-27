import { beforeEach, describe, expect, it, vi } from "vitest";
import { AlertPoller, inferEventType } from "./alertPoller";
import { loadAlertFixture, testAppConfig } from "../test/helpers/alertTestHelpers";

const sendMail = vi.fn().mockResolvedValue(undefined);
const hasNotified = vi.fn().mockResolvedValue(false);
const getLastNotifiedVersion = vi.fn().mockResolvedValue(undefined);
const markNotified = vi.fn().mockResolvedValue(undefined);
const getLastPollAt = vi.fn().mockResolvedValue("2025-11-19T20:00:00.000Z");
const setLastPollAt = vi.fn().mockResolvedValue(undefined);
const listAllAlerts = vi.fn();

vi.mock("./graphMailSender", () => ({
  sendAlertEmail: (...args: unknown[]) => sendMail(...args),
}));

vi.mock("./notificationStateStore", () => ({
  NotificationStateStore: vi.fn().mockImplementation(() => ({
    hasNotified,
    getLastNotifiedVersion,
    markNotified,
    getLastPollAt,
    setLastPollAt,
  })),
}));

vi.mock("./socketApiClient", () => ({
  listAllAlerts: (...args: unknown[]) => listAllAlerts(...args),
}));

describe("inferEventType", () => {
  it("returns created when no prior version", () => {
    expect(inferEventType({ status: "open" }, undefined)).toBe("alert:created");
  });

  it("returns updated when prior version exists", () => {
    expect(inferEventType({ status: "open" }, 3)).toBe("alert:updated");
  });

  it("returns cleared when status is cleared", () => {
    expect(inferEventType({ status: "cleared" }, 5)).toBe("alert:cleared");
  });
});

describe("AlertPoller", () => {
  beforeEach(() => {
    sendMail.mockClear();
    hasNotified.mockReset().mockResolvedValue(false);
    getLastNotifiedVersion.mockReset().mockResolvedValue(undefined);
    markNotified.mockClear();
    getLastPollAt.mockReset().mockResolvedValue("2025-11-19T20:00:00.000Z");
    setLastPollAt.mockClear();
    listAllAlerts.mockReset();
  });

  it("bootstraps on first poll without sending mail", async () => {
    getLastPollAt.mockResolvedValueOnce(undefined);
    const poller = new AlertPoller(testAppConfig());

    const result = await poller.poll(new Date("2025-11-20T12:00:00.000Z"));

    expect(result.bootstrapped).toBe(true);
    expect(result.sent).toBe(0);
    expect(sendMail).not.toHaveBeenCalled();
    expect(setLastPollAt).toHaveBeenCalledOnce();
    expect(listAllAlerts).not.toHaveBeenCalled();
  });

  it("processes alert-created fixture and sends mail", async () => {
    const alert = loadAlertFixture("alert-created");
    const poller = new AlertPoller(testAppConfig());

    const result = await poller.processAlert(alert);

    expect(result).toEqual({
      status: "sent",
      alertId: "alert-prototype-lodash-001",
      version: 1,
      eventType: "alert:created",
    });
    expect(sendMail).toHaveBeenCalledOnce();
    expect(markNotified).toHaveBeenCalledOnce();
  });

  it("skips duplicate notification key", async () => {
    hasNotified.mockResolvedValue(true);
    const alert = loadAlertFixture("alert-updated");
    const poller = new AlertPoller(testAppConfig());

    const result = await poller.processAlert(alert);

    expect(result).toEqual({
      status: "duplicate",
      alertId: "alert-prototype-lodash-001",
      version: 5,
    });
    expect(sendMail).not.toHaveBeenCalled();
  });

  it("skips below MIN_SEVERITY", async () => {
    const alert = loadAlertFixture("alert-cleared");
    const poller = new AlertPoller(testAppConfig({ minSeverity: "high" }));

    const result = await poller.processAlert(alert);

    expect(result.status).toBe("skipped");
    if (result.status === "skipped") {
      expect(result.reason).toBe("Below MIN_SEVERITY");
    }
  });

  it("polls API and sends for returned alerts", async () => {
    const alert = loadAlertFixture("alert-created");
    listAllAlerts.mockResolvedValue([alert]);
    const poller = new AlertPoller(testAppConfig());

    const result = await poller.poll(new Date("2025-11-20T12:15:00.000Z"));

    expect(result.bootstrapped).toBe(false);
    expect(result.alertsFetched).toBe(1);
    expect(result.sent).toBe(1);
    expect(listAllAlerts).toHaveBeenCalledOnce();
  });
});
