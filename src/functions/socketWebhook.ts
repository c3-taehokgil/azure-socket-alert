import { app, HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";
import { WebhookProcessor } from "../services/webhookProcessor";
import { WebhookSignatureError } from "../services/webhookSignatureValidator";

export async function socketWebhook(
  request: HttpRequest,
  context: InvocationContext,
): Promise<HttpResponseInit> {
  if (request.method !== "POST") {
    return { status: 405, jsonBody: { error: "Method not allowed" } };
  }

  const rawBody = await request.text();
  const signatureHeader = request.headers.get("x-webhook-signature") ?? undefined;

  try {
    const processor = new WebhookProcessor();
    const result = await processor.process(rawBody, signatureHeader);

    context.log("Webhook processed", {
      outcome: result.status,
      eventId: "eventId" in result ? result.eventId : undefined,
      reason: "reason" in result ? result.reason : undefined,
    });

    switch (result.status) {
      case "sent":
      case "duplicate":
        return { status: 200, jsonBody: { ok: true, outcome: result.status, eventId: result.eventId } };
      case "skipped":
      case "ignored":
        return { status: 200, jsonBody: { ok: true, outcome: result.status, reason: result.reason } };
      default:
        return { status: 200, jsonBody: { ok: true } };
    }
  } catch (error: unknown) {
    if (error instanceof WebhookSignatureError) {
      context.warn("Webhook signature rejected", { message: error.message });
      return { status: 401, jsonBody: { error: "Invalid webhook signature" } };
    }

    context.error("Webhook processing failed", error);
    return { status: 500, jsonBody: { error: "Internal server error" } };
  }
}

app.http("socketWebhook", {
  methods: ["POST"],
  authLevel: "function",
  route: "socket-webhook",
  handler: socketWebhook,
});
