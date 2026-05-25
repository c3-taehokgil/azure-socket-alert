import { createHmac, timingSafeEqual } from "node:crypto";

export class WebhookSignatureError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "WebhookSignatureError";
  }
}

function decodeSigningKey(secret: string): Buffer {
  const trimmed = secret.trim();
  const encoded = trimmed.startsWith("whsec_") ? trimmed.slice("whsec_".length) : trimmed;
  return Buffer.from(encoded, "base64");
}

function parseSignatureHeader(header: string | undefined): { timestamp: string; signature: string } {
  if (!header?.trim()) {
    throw new WebhookSignatureError("Missing x-webhook-signature header");
  }

  const parts = header.split(",").map((part) => part.trim());
  let timestamp: string | undefined;
  let signature: string | undefined;

  for (const part of parts) {
    if (part.startsWith("t=")) {
      timestamp = part.slice(2);
    } else if (part.startsWith("s=")) {
      signature = part.slice(2);
    }
  }

  if (!timestamp || !signature) {
    throw new WebhookSignatureError("Invalid x-webhook-signature format");
  }

  return { timestamp, signature };
}

export function verifyWebhookSignature(
  rawBody: string,
  signatureHeader: string | undefined,
  secret: string,
  maxAgeSeconds: number,
): void {
  const { timestamp, signature } = parseSignatureHeader(signatureHeader);

  const timestampSeconds = Number(timestamp);
  if (!Number.isFinite(timestampSeconds)) {
    throw new WebhookSignatureError("Invalid signature timestamp");
  }

  const ageSeconds = Math.abs(Math.floor(Date.now() / 1000) - timestampSeconds);
  if (ageSeconds > maxAgeSeconds) {
    throw new WebhookSignatureError("Webhook signature timestamp outside allowed window");
  }

  const key = decodeSigningKey(secret);
  const signedPayload = `${timestamp}.${rawBody}`;
  const expected = createHmac("sha256", key).update(signedPayload, "utf8").digest("base64");

  const expectedBuffer = Buffer.from(expected, "utf8");
  const actualBuffer = Buffer.from(signature, "utf8");

  if (expectedBuffer.length !== actualBuffer.length || !timingSafeEqual(expectedBuffer, actualBuffer)) {
    throw new WebhookSignatureError("Webhook signature verification failed");
  }
}
