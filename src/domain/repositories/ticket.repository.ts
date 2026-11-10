import type { Ticket } from "../entities/ticket";
import type { EventMetadata, StoredTicketEvent } from "../events/ticket-events";

export interface TicketRepository {
  load(id: string): Promise<Ticket | null>;
  save(ticket: Ticket, metadata: EventMetadata): Promise<StoredTicketEvent[]>;
}
