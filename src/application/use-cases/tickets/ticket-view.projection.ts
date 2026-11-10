import type { StoredTicketEvent } from "../../../domain/events/ticket-events";
import type { TicketPriority } from "../../../domain/services/ticket-priority";
import type { ClassificationSource } from "../../../domain/value-objects/classification";
import type { TicketStatus } from "../../../domain/value-objects/ticket-status";
import type { TicketType } from "../../../domain/value-objects/ticket-type";
import type { Urgency } from "../../../domain/value-objects/urgency";
import { stateFor } from "../../../domain/entities/ticket-state";

export interface TicketView {
  id: string;
  version: number;
  status: TicketStatus;
  subject: string;
  description: string;
  customerEmail: string;
  customerName: string;
  createdBy: string;
  createdAt: string;
  ticketType: TicketType | null;
  urgency: Urgency | null;
  tags: readonly string[];
  classificationSource: ClassificationSource | null;
  classificationConfidence: number | null;
  classifiedAt: string | null;
  priority: TicketPriority | null;
  assigneeId: string | null;
  assigneeName: string | null;
  specialtyId: string | null;
  specialtyName: string | null;
  assignedAt: string | null;
  solvedAt: string | null;
  canceledAt: string | null;
  resolutionMinutes: number | null;
  needsManualTriage: boolean;
}

const MS_PER_MINUTE = 60_000;

function emptyView(stored: StoredTicketEvent): TicketView {
  return {
    id: stored.ticketId,
    version: 0,
    status: "received",
    subject: "",
    description: "",
    customerEmail: "",
    customerName: "",
    createdBy: "",
    createdAt: stored.occurredAt,
    ticketType: null,
    urgency: null,
    tags: [],
    classificationSource: null,
    classificationConfidence: null,
    classifiedAt: null,
    priority: null,
    assigneeId: null,
    assigneeName: null,
    specialtyId: null,
    specialtyName: null,
    assignedAt: null,
    solvedAt: null,
    canceledAt: null,
    resolutionMinutes: null,
    needsManualTriage: false,
  };
}

function minutesBetween(from: string, to: string): number {
  return Math.round((Date.parse(to) - Date.parse(from)) / MS_PER_MINUTE);
}

function applyStored(view: TicketView, stored: StoredTicketEvent): TicketView {
  const next: TicketView = { ...view, version: stored.version };
  const { event } = stored;
  switch (event.type) {
    case "TicketReceived":
      return {
        ...next,
        subject: event.payload.subject,
        description: event.payload.description,
        customerEmail: event.payload.customer.email,
        customerName: event.payload.customer.name,
        createdBy: event.payload.createdBy,
        createdAt: stored.occurredAt,
      };
    case "TicketClassified":
      return {
        ...next,
        ticketType: event.payload.ticketType,
        urgency: event.payload.urgency,
        tags: event.payload.tags,
        classificationSource: event.payload.source,
        classificationConfidence: event.payload.confidence,
        classifiedAt: stored.occurredAt,
        needsManualTriage: false,
      };
    case "TicketClassificationFailed":
    case "TicketAssignmentFailed":
      return { ...next, needsManualTriage: true };
    case "TicketAssigned":
      return {
        ...next,
        status: stateFor(next.status).assign().status,
        priority: event.payload.priority,
        assigneeId: event.payload.agentId,
        assigneeName: event.payload.agentName,
        specialtyId: event.payload.specialtyId,
        specialtyName: event.payload.specialtyName,
        assignedAt: stored.occurredAt,
        needsManualTriage: false,
      };
    case "TicketSolvingStarted":
      return { ...next, status: stateFor(next.status).startSolving().status };
    case "TicketPaused":
      return { ...next, status: stateFor(next.status).pause().status };
    case "TicketResumed":
      return { ...next, status: stateFor(next.status).resume().status };
    case "TicketSolved":
      return {
        ...next,
        status: stateFor(next.status).solve().status,
        solvedAt: stored.occurredAt,
        resolutionMinutes: minutesBetween(next.createdAt, stored.occurredAt),
      };
    case "TicketCanceled":
      return {
        ...next,
        status: stateFor(next.status).cancel().status,
        canceledAt: stored.occurredAt,
      };
  }
}

export function projectTicketView(history: readonly StoredTicketEvent[]): TicketView {
  const [first, ...rest] = history;
  if (!first) throw new Error("Cannot project a ticket from an empty history");
  return rest.reduce(applyStored, applyStored(emptyView(first), first));
}
