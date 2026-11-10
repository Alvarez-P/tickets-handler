import { Ticket } from "../../../domain/entities/ticket";
import { TicketNotFound } from "../../../domain/errors/ticket-errors";
import { TicketUnitOfWork } from "../../../shared/contracts/ticket-unit-of-work";
import { UseCase } from "../../../shared/contracts/use-case";
import { correlationContext } from "../../../shared/observability/correlation-context";
import { publishTicketEvents } from "./publish-ticket-events";

export type TicketTransition =
  | { action: "start-solving" }
  | { action: "pause"; reason?: string }
  | { action: "resume" }
  | { action: "solve"; resolution: string }
  | { action: "cancel"; reason: string };

export interface TransitionTicketCommand {
  ticketId: string;
  actorId: string;
  transition: TicketTransition;
}

export interface TransitionedTicket {
  id: string;
  status: Ticket["status"];
}

const applyTransition = (ticket: Ticket, actorId: string, transition: TicketTransition): void => {
  switch (transition.action) {
    case "start-solving":
      return ticket.startSolving(actorId);
    case "pause":
      return ticket.pause(actorId, transition.reason);
    case "resume":
      return ticket.resume(actorId);
    case "solve":
      return ticket.solve(actorId, transition.resolution);
    case "cancel":
      return ticket.cancel(actorId, transition.reason);
  }
};

export class TransitionTicket implements UseCase<TransitionTicketCommand, TransitionedTicket> {
  constructor(private readonly unitOfWork: TicketUnitOfWork) {}

  execute({ ticketId, actorId, transition }: TransitionTicketCommand): Promise<TransitionedTicket> {
    return this.unitOfWork.run(async ({ tickets, agents, outbox }) => {
      const ticket = await tickets.load(ticketId);
      if (!ticket) {
        throw new TicketNotFound();
      }
      const assigneeId = ticket.assigneeId;
      applyTransition(ticket, actorId, transition);
      const stored = await tickets.save(ticket, { correlationId: correlationContext.get() ?? ticketId, actorId });
      await publishTicketEvents(outbox, stored);
      if (assigneeId && (transition.action === "solve" || transition.action === "cancel")) {
        await agents.adjustOpenTickets(assigneeId, -1);
      }
      return { id: ticketId, status: ticket.status };
    });
  }
}
