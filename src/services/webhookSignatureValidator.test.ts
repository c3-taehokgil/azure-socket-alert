import { describe, expect, it } from "vitest";
import { verifyWebhookSignature, WebhookSignatureError } from "./webhookSignatureValidator";
import {
  TEST_WEBHOOK_SECRET,
  fixtureRawBody,
  signWebhookPayload,
} from "../test/helpers/webhookTestHelpers";

describe("verifyWebhookSignature", () => {
  it("accepts a valid signature on alert-created fixture", () => {
    const body = fixtureRawBody("alert-created");
    const header = signWebhookPayload(body);

    expect(() =>
      verifyWebhookSignature(body, header, TEST_WEBHOOK_SECRET, 300),
    ).not.toThrow();
  });

  it("accepts all Socket dummy alert fixtures", () => {
    for (const name of ["alert-created", "alert-updated", "alert-cleared"] as const) {
      const body = fixtureRawBody(name);
      const header = signWebhookPayload(body);
      expect(() =>
        verifyWebhookSignature(body, header, TEST_WEBHOOK_SECRET, 300),
      ).not.toThrow();
    }
  });

  it("rejects tampered body", () => {
    const body = fixtureRawBody("alert-created");
    const header = signWebhookPayload(body);

    expect(() =>
      verifyWebhookSignature(body + " ", header, TEST_WEBHOOK_SECRET, 300),
    ).toThrow(WebhookSignatureError);
  });

  it("rejects stale timestamps", () => {
    const body = fixtureRawBody("alert-updated");
    const timestamp = Math.floor(Date.now() / 1000) - 600;
    const header = signWebhookPayload(body, TEST_WEBHOOK_SECRET, timestamp);

    expect(() =>
      verifyWebhookSignature(body, header, TEST_WEBHOOK_SECRET, 300),
    ).toThrow(/timestamp outside allowed window/);
  });
});
