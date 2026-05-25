import { TableClient } from "@azure/data-tables";

const PARTITION_KEY = "socket";

export class IdempotencyStore {
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

  async hasProcessed(eventId: string): Promise<boolean> {
    await this.ensureTable();
    try {
      await this.client.getEntity(PARTITION_KEY, eventId);
      return true;
    } catch (error: unknown) {
      const status = (error as { statusCode?: number }).statusCode;
      if (status === 404) {
        return false;
      }
      throw error;
    }
  }

  async markProcessed(eventId: string, eventType: string): Promise<void> {
    await this.ensureTable();
    await this.client.createEntity({
      partitionKey: PARTITION_KEY,
      rowKey: eventId,
      eventType,
      processedAt: new Date().toISOString(),
    });
  }
}
