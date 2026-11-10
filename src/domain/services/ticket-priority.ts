import type { Urgency } from "../value-objects/urgency";

export const TICKET_PRIORITIES = ["critical", "high", "normal", "low"] as const;

export type TicketPriority = (typeof TICKET_PRIORITIES)[number];

const PRIORITY_BY_URGENCY: Record<Urgency, TicketPriority> = {
  0: "low",
  1: "normal",
  2: "high",
  3: "critical",
};

export function ticketPriority(urgency: Urgency): TicketPriority {
  return PRIORITY_BY_URGENCY[urgency];
}
