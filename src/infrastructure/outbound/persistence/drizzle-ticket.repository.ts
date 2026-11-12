import { randomUUID } from "node:crypto";
import { Ticket } from "../../../domain/entities/ticket";
import { ConcurrencyConflict } from "../../../domain/errors/ticket-errors";
import { EventMetadata, StoredTicketEvent } from "../../../domain/events/ticket-events";
import { TicketRepository } from "../../../domain/repositories/ticket.repository";
import { DrizzleClient } from "./drizzle-client";
import { DrizzleTicketEventLog, toStoredTicketEvent } from "./drizzle-ticket-event-log";
import { ticketEvents } from "./schema";
import { violatedUniqueConstraint } from "./unique-violation";

const VERSION_CONSTRAINT = "ticket_events_ticket_version_idx";

export class DrizzleTicketRepository implements TicketRepository {
  private readonly log: DrizzleTicketEventLog;

  constructor(private readonly db: DrizzleClient) {
    this.log = new DrizzleTicketEventLog(db);
  }

  async load(id: string): Promise<Ticket | null> {
    const history = await this.log.load(id);
    return history.length === 0 ? null : Ticket.rehydrate(history);
  }

  async save(ticket: Ticket, metadata: EventMetadata): Promise<StoredTicketEvent[]> {
    const events = ticket.pullPendingEvents();
    if (events.length === 0) {
      return [];
    }
    const firstVersion = ticket.version - events.length + 1;
    try {
      const rows = await this.db
        .insert(ticketEvents)
        .values(
          events.map((event, index) => ({
            eventId: randomUUID(),
            ticketId: ticket.id,
            version: firstVersion + index,
            type: event.type,
            event,
            metadata,
          })),
        )
        .returning();
      return rows.map(toStoredTicketEvent);
    } catch (error) {
      if (violatedUniqueConstraint(error) === VERSION_CONSTRAINT) {
        throw new ConcurrencyConflict();
      }
      throw error;
    }
  }
}
