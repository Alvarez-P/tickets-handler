import { DomainError } from "./domain-error";
import type { TicketStatus } from "../value-objects/ticket-status";

export class InvalidTicketTransition extends DomainError {
  readonly code = "invalid_ticket_transition";

  constructor(
    readonly from: TicketStatus,
    readonly action: string,
  ) {
    super(`Cannot ${action} a ticket in status ${from}`);
  }
}

export class ConcurrencyConflict extends DomainError {
  readonly code = "concurrency_conflict";

  constructor(message = "Ticket was modified concurrently") {
    super(message);
  }
}

export class TicketNotFound extends DomainError {
  readonly code = "ticket_not_found";

  constructor() {
    super("Ticket not found");
  }
}

export class NotTicketAssignee extends DomainError {
  readonly code = "not_ticket_assignee";

  constructor() {
    super("Actor is not the assignee of this ticket");
  }
}

export class TicketNotClassified extends DomainError {
  readonly code = "ticket_not_classified";

  constructor() {
    super("Ticket has not been classified");
  }
}
