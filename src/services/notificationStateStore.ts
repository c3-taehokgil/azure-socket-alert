import { TableClient } from "@azure/data-tables";

const NOTIFICATIONS_PARTITION = "notifications";
const STATE_PARTITION = "state";
const LAST_POLL_ROW = "lastPollAt";

export class NotificationStateStore {
  private readonly client: TableClient;
  private initialized = false;

  constructor(connectionString: string, tableName: string) {
    this.client = TableClient.fromConnectionString(connectionString, tableName);
  }

  private async ensureTable(): Promise<void> {
    if (this.initialized) {
      return;
    }
    try {
      await this.client.createTable();
    } catch (error: unknown) {
      const status = (error as { statusCode?: number }).statusCode;
      if (status !== 409) {
        throw error;
      }
    }
    this.initialized = true;
  }

  async getLastPollAt(): Promise<string | undefined> {
    await this.ensureTable();
    try {
      const entity = await this.client.getEntity(STATE_PARTITION, LAST_POLL_ROW);
      const value = entity.pollAt;
      return typeof value === "string" ? value : undefined;
    } catch (error: unknown) {
      const status = (error as { statusCode?: number }).statusCode;
      if (status === 404) {
        return undefined;
      }
      throw error;
    }
  }

  async setLastPollAt(isoTimestamp: string): Promise<void> {
    await this.ensureTable();
    await this.client.upsertEntity({
      partitionKey: STATE_PARTITION,
      rowKey: LAST_POLL_ROW,
      pollAt: isoTimestamp,
    });
  }

  async getLastNotifiedVersion(alertId: string): Promise<number | undefined> {
    await this.ensureTable();
    try {
      const entity = await this.client.getEntity(NOTIFICATIONS_PARTITION, alertId);
      const version = entity.lastVersion;
      return typeof version === "number" ? version : Number(version);
    } catch (error: unknown) {
      const status = (error as { statusCode?: number }).statusCode;
      if (status === 404) {
        return undefined;
      }
      throw error;
    }
  }

  async hasNotified(notificationKey: string): Promise<boolean> {
    await this.ensureTable();
    try {
      await this.client.getEntity(NOTIFICATIONS_PARTITION, notificationKey);
      return true;
    } catch (error: unknown) {
      const status = (error as { statusCode?: number }).statusCode;
      if (status === 404) {
        return false;
      }
      throw error;
    }
  }

  async markNotified(
    notificationKey: string,
    alertId: string,
    version: number,
    eventType: string,
  ): Promise<void> {
    await this.ensureTable();
    const processedAt = new Date().toISOString();

    await this.client.createEntity({
      partitionKey: NOTIFICATIONS_PARTITION,
      rowKey: notificationKey,
      alertId,
      version,
      eventType,
      processedAt,
    });

    await this.client.upsertEntity({
      partitionKey: NOTIFICATIONS_PARTITION,
      rowKey: alertId,
      lastVersion: version,
      lastEventType: eventType,
      processedAt,
    });
  }
}
