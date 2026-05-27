import { app, InvocationContext, Timer } from "@azure/functions";
import { AlertPoller } from "../services/alertPoller";
import { SocketApiError } from "../services/socketApiClient";

/** Every 15 minutes (NCRONTAB: second minute hour day month day-of-week). */
const POLL_SCHEDULE = "0 */15 * * * *";

export async function socketAlertPoller(
  _timer: Timer,
  context: InvocationContext,
): Promise<void> {
  try {
    const poller = new AlertPoller();
    const result = await poller.poll();

    context.log("Socket alert poll completed", {
      bootstrapped: result.bootstrapped,
      alertsFetched: result.alertsFetched,
      sent: result.sent,
      duplicates: result.duplicates,
      skipped: result.skipped,
    });
  } catch (error: unknown) {
    if (error instanceof SocketApiError) {
      context.error("Socket API error during poll", {
        message: error.message,
        statusCode: error.statusCode,
      });
      throw error;
    }

    context.error("Alert poll failed", error);
    throw error;
  }
}

app.timer("socketAlertPoller", {
  schedule: POLL_SCHEDULE,
  handler: socketAlertPoller,
});
