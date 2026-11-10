import type { TicketType } from "./ticket-type";
import type { Urgency } from "./urgency";

export type ClassificationSource = "laya" | "rules" | "manual";

export interface Classification {
  ticketType: TicketType;
  urgency: Urgency;
  tags: readonly string[];
  confidence: number;
  source: ClassificationSource;
}
