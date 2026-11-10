import { InvalidTicketTransition } from "../errors/ticket-errors";
import type { TicketStatus } from "../value-objects/ticket-status";

export abstract class TicketState {
  abstract readonly status: TicketStatus;

  get isFinal(): boolean {
    return false;
  }

  assign(): TicketState {
    throw new InvalidTicketTransition(this.status, "assign");
  }

  startSolving(): TicketState {
    throw new InvalidTicketTransition(this.status, "startSolving");
  }

  pause(): TicketState {
    throw new InvalidTicketTransition(this.status, "pause");
  }

  resume(): TicketState {
    throw new InvalidTicketTransition(this.status, "resume");
  }

  solve(): TicketState {
    throw new InvalidTicketTransition(this.status, "solve");
  }

  cancel(): TicketState {
    throw new InvalidTicketTransition(this.status, "cancel");
  }
}

export class ReceivedState extends TicketState {
  readonly status = "received";

  override assign(): TicketState {
    return new AssignedState();
  }

  override cancel(): TicketState {
    return new CanceledState();
  }
}

export class AssignedState extends TicketState {
  readonly status = "assigned";

  override startSolving(): TicketState {
    return new SolvingState();
  }

  override cancel(): TicketState {
    return new CanceledState();
  }
}

export class SolvingState extends TicketState {
  readonly status = "solving";

  override pause(): TicketState {
    return new PausedState();
  }

  override solve(): TicketState {
    return new SolvedState();
  }

  override cancel(): TicketState {
    return new CanceledState();
  }
}

export class PausedState extends TicketState {
  readonly status = "paused";

  override resume(): TicketState {
    return new SolvingState();
  }

  override cancel(): TicketState {
    return new CanceledState();
  }
}

export class SolvedState extends TicketState {
  readonly status = "solved";

  override get isFinal(): boolean {
    return true;
  }
}

export class CanceledState extends TicketState {
  readonly status = "canceled";

  override get isFinal(): boolean {
    return true;
  }
}

export function stateFor(status: TicketStatus): TicketState {
  switch (status) {
    case "received":
      return new ReceivedState();
    case "assigned":
      return new AssignedState();
    case "solving":
      return new SolvingState();
    case "paused":
      return new PausedState();
    case "solved":
      return new SolvedState();
    case "canceled":
      return new CanceledState();
  }
}
