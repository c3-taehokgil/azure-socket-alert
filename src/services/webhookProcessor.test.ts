import { beforeEach, describe, expect, it, vi } from "vitest";
import { WebhookProcessor } from "./webhookProcessor";
import {
  signedFixtureRequest,
  testAppConfig,
  TEST_WEBHOOK_SECRET,
} from "../test/helpers/webhookTestHelpers";

const sendMail = vi.fn().mockResolvedValue(undefined);
const hasProcessed = vi.fn().mockResolvedValue(false);
const markProcessed = vi.fn().mockResolvedValue(undefined);

vi.mock("./graphMailSender", () => ({
  sendAlertEmail: (...args: unknown[]) => sendMail(...args),
}));

vi.mock("./idempotencyStore", () => ({
  IdempotencyStore: vi.fn().mockImplementation(() => ({
    hasProcessed,
    markProcessed,
  })),
}));

describe("WebhookProcessor with Socket dummy fixtures", () => {
  beforeEach(() => {
    sendMail.mockClear();
    hasProcessed.mockReset().mockResolvedValue(false);
    markProcessed.mockClear();
  });

  it("processes signed alert-created fixture and sends mail", async () => {
    const { rawBody, signatureHeader } = signedFixtureRequest("alert-created");
    const processor = new WebhookProcessor(testAppConfig());

    const result = await processor.process(rawBody, signatureHeader);

    expect(result).toEqual({ status: "sent", eventId: "SOCKET-DUMMY-CREATED-2751@1" });
    expect(sendMail).toHaveBeenCalledOnce();
    expect(markProcessed).toHaveBeenCalledOnce();
  });

  it("skips duplicate eventId", async () => {
    hasProcessed.mockResolvedValue(true);
    const { rawBody, signatureHeader } = signedFixtureRequest("alert-updated");
    const processor = new WebhookProcessor(testAppConfig());

    const result = await processor.process(rawBody, signatureHeader);

    expect(result).toEqual({ status: "duplicate", eventId: "SOCKET-DUMMY-UPDATED-2751@5" });
    expect(sendMail).not.toHaveBeenCalled();
  });

  it("skips when org slug mismatches", async () => {
    const { rawBody, signatureHeader } = signedFixtureRequest("alert-created");
    const processor = new WebhookProcessor(
      testAppConfig({ socketOrgSlug: "other-org", webhookSecret: TEST_WEBHOOK_SECRET }),
    );

    const result = await processor.process(rawBody, signatureHeader);

    expect(result.status).toBe("skipped");
    if (result.status === "skipped") {
      expect(result.reason).toBe("Organization slug mismatch");
    }
  });

  it("skips below MIN_SEVERITY", async () => {
    const { rawBody, signatureHeader } = signedFixtureRequest("alert-cleared");
    const processor = new WebhookProcessor(
      testAppConfig({ minSeverity: "high", webhookSecret: TEST_WEBHOOK_SECRET }),
    );

    const result = await processor.process(rawBody, signatureHeader);

    expect(result.status).toBe("skipped");
    if (result.status === "skipped") {
      expect(result.reason).toBe("Below MIN_SEVERITY");
    }
  });
});
