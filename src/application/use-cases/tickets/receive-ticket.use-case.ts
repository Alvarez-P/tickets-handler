import { randomUUID } from "node:crypto";
import { Ticket, ReceiveTicketInput } from "../../../domain/entities/ticket";
import { TicketCustomer } from "../../../domain/events/ticket-events";
import { TicketClassifier } from "../../../domain/services/ticket-classifier";
import { TicketUnitOfWork } from "../../../shared/contracts/ticket-unit-of-work";
import { UseCase } from "../../../shared/contracts/use-case";
import { correlationContext } from "../../../shared/observability/correlation-context";
import { publishTicketEvents } from "./publish-ticket-events";

export interface ReceiveTicketCommand {
  subject: string;
  description: string;
  customer: TicketCustomer;
  createdBy: string;
}

export interface ReceivedTicket {
  id: string;
  status: Ticket["status"];
  assigneeId: string | null;
  needsManualTriage: boolean;
}

export class ReceiveTicket implements UseCase<ReceiveTicketCommand, ReceivedTicket> {
  constructor(
    private readonly unitOfWork: TicketUnitOfWork,
    private readonly classifier: TicketClassifier,
  ) {}

  async execute(command: ReceiveTicketCommand): Promise<ReceivedTicket> {
    const input: ReceiveTicketInput = command;
    const id = randomUUID();
    const ticket = Ticket.receive(id, input);
    const classification = await this.classifier.classify(command).catch(() => null);
    if (classification) {
      ticket.classify(classification);
    } else {
      ticket.failClassification("classifier-unavailable");
    }
    return this.unitOfWork.run(async ({ tickets, agents, specialties, outbox }) => {
      if (classification) {
        const specialty = await specialties.findActiveByTicketType(classification.ticketType);
        const agent = specialty ? await agents.findLeastLoaded(specialty.id) : null;
        if (specialty && agent) {
          ticket.assign(agent, { id: specialty.id, name: specialty.name });
          await agents.adjustOpenTickets(agent.id, 1);
        } else {
          ticket.failAssignment(specialty ? "no-agent-available" : "no-active-specialty");
        }
      }
      const stored = await tickets.save(ticket, {
        correlationId: correlationContext.get() ?? id,
        actorId: command.createdBy,
      });
      await publishTicketEvents(outbox, stored);
      return {
        id,
        status: ticket.status,
        assigneeId: ticket.assigneeId,
        needsManualTriage: ticket.needsManualTriage,
      };
    });
  }
}
