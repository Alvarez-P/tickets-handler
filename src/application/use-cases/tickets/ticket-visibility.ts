import { GetTicketInput } from "./get-ticket.use-case";
import { SearchTicketsInput } from "./search-tickets.use-case";

export interface TicketViewer {
  sub: string;
  roles: readonly string[];
}

const seesAllTickets = (roles: readonly string[]): boolean =>
  roles.some((role) => role === "admin" || role === "support-agent");

export const scopeTicketSearch = ({ sub, roles }: TicketViewer, input: SearchTicketsInput): SearchTicketsInput =>
  seesAllTickets(roles) ? input : { ...input, filters: { ...input.filters, assigneeId: sub } };

export const scopeTicketLookup = ({ sub, roles }: TicketViewer, ticketId: string): GetTicketInput =>
  seesAllTickets(roles) ? { ticketId } : { ticketId, onlyAssignedTo: sub };
