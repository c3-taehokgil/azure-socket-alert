import { describe, expect, it } from "vitest";
import { createHmac } from "node:crypto";
import { verifyWebhookSignature, WebhookSignatureError } from "./webhookSignatureValidator";

const TEST_SECRET = "whsec_" + Buffer.from("test-signing-key-24bytes!!").toString("base64");

function sign(rawBody: string, timestamp: number, secret: string): string {
  const encoded = secret.startsWith("whsec_") ? secret.slice(6) : secret;
  const key = Buffer.from(encoded, "base64");
  const signature = createHmac("sha256", key).update(`${timestamp}.${rawBody}`, "utf8").digest("base64");
  return `t=${timestamp},s=${signature}`;
}

describe("verifyWebhookSignature", () => {
  it("accepts a valid signature", () => {
    const body = JSON.stringify({ type: "alert:created", eventId: "evt-1" });
    const timestamp = Math.floor(Date.now() / 1000);
    const header = sign(body, timestamp, TEST_SECRET);

    expect(() =>
      verifyWebhookSignature(body, header, TEST_SECRET, 300),
    ).not.toThrow();
  });

  it("rejects tampered body", () => {
    const body = JSON.stringify({ type: "alert:created" });
    const timestamp = Math.floor(Date.now() / 1000);
    const header = sign(body, timestamp, TEST_SECRET);

    expect(() =>
      verifyWebhookSignature(body + " ", header, TEST_SECRET, 300),
    ).toThrow(WebhookSignatureError);
  });

  it("rejects stale timestamps", () => {
    const body = JSON.stringify({ type: "alert:created" });
    const timestamp = Math.floor(Date.now() / 1000) - 600;
    const header = sign(body, timestamp, TEST_SECRET);

    expect(() =>
      verifyWebhookSignature(body, header, TEST_SECRET, 300),
    ).toThrow(/timestamp outside allowed window/);
  });
});
