import type { Classification } from "../value-objects/classification";

export interface TicketClassificationInput {
  subject: string;
  description: string;
}

export interface TicketClassifier {
  classify(ticket: TicketClassificationInput): Promise<Classification | null>;
}
