import {
  InvalidTicketTransition,
  NotTicketAssignee,
  TicketNotClassified,
} from "../errors/ticket-errors";
import type {
  AssignmentFailureReason,
  StoredTicketEvent,
  TicketCustomer,
  TicketEvent,
} from "../events/ticket-events";
import { ticketPriority, type TicketPriority } from "../services/ticket-priority";
import type { Classification } from "../value-objects/classification";
import type { TicketStatus } from "../value-objects/ticket-status";
import { ReceivedState, type TicketState } from "./ticket-state";

export interface ReceiveTicketInput {
  subject: string;
  description: string;
  customer: TicketCustomer;
  createdBy: string;
}

export interface AgentRef {
  id: string;
  name: string;
}

export interface SpecialtyRef {
  id: string;
  name: string;
}

export class Ticket {
  private state: TicketState = new ReceivedState();
  private persistedVersion = 0;
  private pending: TicketEvent[] = [];
  private currentClassification: Classification | null = null;
  private currentAssigneeId: string | null = null;
  private manualTriage = false;
  private currentPriority: TicketPriority | null = null;

  private constructor(readonly id: string) {}

  static receive(id: string, input: ReceiveTicketInput): Ticket {
    const ticket = new Ticket(id);
    ticket.emit({ type: "TicketReceived", payload: input });
    return ticket;
  }

  static rehydrate(history: readonly StoredTicketEvent[]): Ticket {
    const first = history[0];
    if (!first) {
      throw new Error("Cannot rehydrate a ticket from an empty history");
    }
    const ticket = new Ticket(first.ticketId);
    history.forEach((stored, index) => {
      if (stored.version !== index + 1) {
        throw new Error(`Non-contiguous event version ${stored.version} at index ${index}`);
      }
      ticket.apply(stored.event);
      ticket.persistedVersion = stored.version;
    });
    return ticket;
  }

  get version(): number {
    return this.persistedVersion + this.pending.length;
  }

  get status(): TicketStatus {
    return this.state.status;
  }

  get classification(): Classification | null {
    return this.currentClassification;
  }

  get assigneeId(): string | null {
    return this.currentAssigneeId;
  }

  get needsManualTriage(): boolean {
    return this.manualTriage;
  }

  get priority(): TicketPriority | null {
    return this.currentPriority;
  }

  classify(classification: Classification): void {
    if (this.currentClassification) return;
    this.requireReceived("classify");
    this.emit({ type: "TicketClassified", payload: classification });
  }

  failClassification(reason: string): void {
    this.requireReceived("failClassification");
    if (this.currentClassification) {
      throw new InvalidTicketTransition(this.status, "failClassification");
    }
    this.emit({ type: "TicketClassificationFailed", payload: { reason } });
  }

  assign(agent: AgentRef, specialty: SpecialtyRef): void {
    if (!this.currentClassification) throw new TicketNotClassified();
    if (this.currentAssigneeId === agent.id) return;
    this.state.assign();
    this.emit({
      type: "TicketAssigned",
      payload: {
        agentId: agent.id,
        agentName: agent.name,
        specialtyId: specialty.id,
        specialtyName: specialty.name,
        priority: ticketPriority(this.currentClassification.urgency),
      },
    });
  }

  failAssignment(reason: AssignmentFailureReason): void {
    if (!this.currentClassification) throw new TicketNotClassified();
    this.requireReceived("failAssignment");
    this.emit({ type: "TicketAssignmentFailed", payload: { reason } });
  }

  startSolving(actorId: string): void {
    this.state.startSolving();
    this.requireAssignee(actorId);
    this.emit({ type: "TicketSolvingStarted", payload: { actorId } });
  }

  pause(actorId: string, reason?: string): void {
    this.state.pause();
    this.requireAssignee(actorId);
    this.emit({ type: "TicketPaused", payload: reason === undefined ? { actorId } : { actorId, reason } });
  }

  resume(actorId: string): void {
    this.state.resume();
    this.requireAssignee(actorId);
    this.emit({ type: "TicketResumed", payload: { actorId } });
  }

  solve(actorId: string, resolution: string): void {
    this.state.solve();
    this.requireAssignee(actorId);
    this.emit({ type: "TicketSolved", payload: { actorId, resolution } });
  }

  cancel(actorId: string, reason: string): void {
    this.state.cancel();
    this.emit({ type: "TicketCanceled", payload: { actorId, reason } });
  }

  pullPendingEvents(): readonly TicketEvent[] {
    const events = this.pending;
    this.pending = [];
    this.persistedVersion += events.length;
    return events;
  }

  private requireReceived(action: string): void {
    if (this.status !== "received") throw new InvalidTicketTransition(this.status, action);
  }

  private requireAssignee(actorId: string): void {
    if (this.currentAssigneeId !== actorId) throw new NotTicketAssignee();
  }

  private emit(event: TicketEvent): void {
    this.apply(event);
    this.pending.push(event);
  }

  private apply(event: TicketEvent): void {
    switch (event.type) {
      case "TicketReceived":
        break;
      case "TicketClassified":
        this.currentClassification = event.payload;
        this.manualTriage = false;
        break;
      case "TicketClassificationFailed":
      case "TicketAssignmentFailed":
        this.manualTriage = true;
        break;
      case "TicketAssigned":
        this.state = this.state.assign();
        this.currentAssigneeId = event.payload.agentId;
        this.currentPriority = event.payload.priority;
        this.manualTriage = false;
        break;
      case "TicketSolvingStarted":
        this.state = this.state.startSolving();
        break;
      case "TicketPaused":
        this.state = this.state.pause();
        break;
      case "TicketResumed":
        this.state = this.state.resume();
        break;
      case "TicketSolved":
        this.state = this.state.solve();
        break;
      case "TicketCanceled":
        this.state = this.state.cancel();
        break;
    }
  }
}
