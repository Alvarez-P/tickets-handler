import type { Classification } from "../value-objects/classification";
import type { TicketPriority } from "../services/ticket-priority";

export interface TicketCustomer {
  email: string;
  name: string;
}

export type AssignmentFailureReason = "no-active-specialty" | "no-agent-available";

export type TicketEvent =
  | {
      type: "TicketReceived";
      payload: {
        subject: string;
        description: string;
        customer: TicketCustomer;
        createdBy: string;
      };
    }
  | { type: "TicketClassified"; payload: Classification }
  | { type: "TicketClassificationFailed"; payload: { reason: string } }
  | {
      type: "TicketAssigned";
      payload: {
        agentId: string;
        agentName: string;
        specialtyId: string;
        specialtyName: string;
        priority: TicketPriority;
      };
    }
  | { type: "TicketAssignmentFailed"; payload: { reason: AssignmentFailureReason } }
  | { type: "TicketSolvingStarted"; payload: { actorId: string } }
  | { type: "TicketPaused"; payload: { actorId: string; reason?: string } }
  | { type: "TicketResumed"; payload: { actorId: string } }
  | { type: "TicketSolved"; payload: { actorId: string; resolution: string } }
  | { type: "TicketCanceled"; payload: { actorId: string; reason: string } };

export const TICKET_EVENTS_TOPIC = "ticket.events";

export interface TicketEventMessage {
  type: TicketEvent["type"];
  eventId: string;
  ticketId: string;
  version: number;
  position: string;
  occurredAt: string;
  correlationId: string;
  event: TicketEvent;
}

export interface EventMetadata {
  correlationId: string;
  causationId?: string;
  actorId?: string;
  requestFingerprint?: string;
}

export interface StoredTicketEvent {
  eventId: string;
  position: string;
  ticketId: string;
  version: number;
  occurredAt: string;
  metadata: EventMetadata;
  event: TicketEvent;
}
