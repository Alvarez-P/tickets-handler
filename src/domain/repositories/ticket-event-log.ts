import type { StoredTicketEvent } from "../events/ticket-events";

export interface TicketEventLog {
  load(id: string): Promise<StoredTicketEvent[]>;
  listTicketIds(afterId: string | null, limit: number): Promise<string[]>;
  maxPosition(): Promise<string>;
  ticketIdsSince(position: string): Promise<string[]>;
}
