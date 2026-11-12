import { and, eq } from "drizzle-orm";
import { InboxStore } from "../events/inbox";
import { DrizzleClient } from "./drizzle-client";
import { processedEvents } from "./schema";

export class DrizzleInbox implements InboxStore {
  constructor(private readonly client: DrizzleClient) {}

  async has(consumer: string, eventId: string): Promise<boolean> {
    const [row] = await this.client
      .select({ eventId: processedEvents.eventId })
      .from(processedEvents)
      .where(and(eq(processedEvents.consumer, consumer), eq(processedEvents.eventId, eventId)));
    return row !== undefined;
  }

  async mark(consumer: string, eventId: string): Promise<void> {
    await this.client.insert(processedEvents).values({ consumer, eventId }).onConflictDoNothing();
  }
}
