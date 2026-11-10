import type { TicketType } from "../value-objects/ticket-type";

export interface Specialty {
  id: string;
  code: string;
  name: string;
  description: string;
  ticketType: TicketType;
  active: boolean;
}
