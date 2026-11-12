import { TicketNotFound } from "../../../domain/errors/ticket-errors";
import { TicketEventLog } from "../../../domain/repositories/ticket-event-log";
import { UseCase } from "../../use-case";
import { TicketView, projectTicketView } from "./ticket-view.projection";

export interface GetTicketInput {
  ticketId: string;
  onlyAssignedTo?: string;
}

export class GetTicket implements UseCase<GetTicketInput, TicketView> {
  constructor(private readonly eventLog: TicketEventLog) {}

  async execute({ ticketId, onlyAssignedTo }: GetTicketInput): Promise<TicketView> {
    const history = await this.eventLog.load(ticketId);
    if (history.length === 0) {
      throw new TicketNotFound();
    }
    const view = projectTicketView(history);
    if (onlyAssignedTo !== undefined && view.assigneeId !== onlyAssignedTo) {
      throw new TicketNotFound();
    }
    return view;
  }
}
