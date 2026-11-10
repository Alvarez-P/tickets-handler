export const TICKET_STATUSES = ["received", "assigned", "solving", "solved", "paused", "canceled"] as const;

export type TicketStatus = (typeof TICKET_STATUSES)[number];
