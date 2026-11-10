import { asc, eq, gt, max } from "drizzle-orm";
import { StoredTicketEvent } from "../../domain/events/ticket-events";
import { TicketEventLog } from "../../domain/repositories/ticket-event-log";
import { DrizzleClient } from "./drizzle-client";
import { ticketEvents } from "./schema";

export const toStoredTicketEvent = (row: typeof ticketEvents.$inferSelect): StoredTicketEvent => ({
  eventId: row.eventId,
  position: String(row.position),
  ticketId: row.ticketId,
  version: row.version,
  occurredAt: row.occurredAt.toISOString(),
  metadata: row.metadata,
  event: row.event,
});

export class DrizzleTicketEventLog implements TicketEventLog {
  constructor(private readonly db: DrizzleClient) {}

  async load(id: string): Promise<StoredTicketEvent[]> {
    const rows = await this.db
      .select()
      .from(ticketEvents)
      .where(eq(ticketEvents.ticketId, id))
      .orderBy(asc(ticketEvents.version));
    return rows.map(toStoredTicketEvent);
  }

  async listTicketIds(afterId: string | null, limit: number): Promise<string[]> {
    const rows = await this.db
      .selectDistinct({ ticketId: ticketEvents.ticketId })
      .from(ticketEvents)
      .where(afterId === null ? undefined : gt(ticketEvents.ticketId, afterId))
      .orderBy(asc(ticketEvents.ticketId))
      .limit(limit);
    return rows.map((row) => row.ticketId);
  }

  async maxPosition(): Promise<string> {
    const [row] = await this.db.select({ position: max(ticketEvents.position) }).from(ticketEvents);
    return String(row?.position ?? 0);
  }

  async ticketIdsSince(position: string): Promise<string[]> {
    const rows = await this.db
      .selectDistinct({ ticketId: ticketEvents.ticketId })
      .from(ticketEvents)
      .where(gt(ticketEvents.position, Number(position)))
      .orderBy(asc(ticketEvents.ticketId));
    return rows.map((row) => row.ticketId);
  }
}
