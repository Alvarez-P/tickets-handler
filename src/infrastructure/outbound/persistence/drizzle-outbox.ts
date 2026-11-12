import { randomUUID } from "node:crypto";
import { asc, inArray, isNull } from "drizzle-orm";
import { OutboxMessage, OutboxStore } from "../../../application/ports/outbox";
import { DrizzleClient } from "./drizzle-client";
import { outboxMessages } from "./schema";

export class DrizzleOutbox implements OutboxStore {
  constructor(private readonly client: DrizzleClient) {}

  async enqueue(topic: string, payload: unknown): Promise<void> {
    await this.client
      .insert(outboxMessages)
      .values({ id: randomUUID(), topic, payload: JSON.stringify(payload), createdAt: new Date().toISOString() });
  }

  async claimPending(limit: number): Promise<OutboxMessage[]> {
    const rows = await this.client
      .select()
      .from(outboxMessages)
      .where(isNull(outboxMessages.publishedAt))
      .orderBy(asc(outboxMessages.createdAt))
      .limit(limit);
    return rows.map((row) => ({ id: row.id, topic: row.topic, payload: JSON.parse(row.payload) }));
  }

  async markPublished(ids: string[]): Promise<void> {
    await this.client
      .update(outboxMessages)
      .set({ publishedAt: new Date().toISOString() })
      .where(inArray(outboxMessages.id, ids));
  }
}
