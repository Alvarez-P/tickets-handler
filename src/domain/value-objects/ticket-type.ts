export const TICKET_TYPES = ["billing", "technical", "account", "shipping", "other"] as const;

export type TicketType = (typeof TICKET_TYPES)[number];
