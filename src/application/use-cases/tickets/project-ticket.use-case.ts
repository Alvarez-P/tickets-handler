import { TicketEventLog } from "../../../domain/repositories/ticket-event-log";
import { SearchIndex } from "../../../shared/contracts/search-index";
import { UseCase } from "../../../shared/contracts/use-case";
import { TicketView, projectTicketView } from "./ticket-view.projection";

export interface ProjectTicketInput {
  ticketId: string;
}

export class ProjectTicket implements UseCase<ProjectTicketInput, void> {
  constructor(
    private readonly eventLog: TicketEventLog,
    private readonly index: SearchIndex<TicketView>,
  ) {}

  async execute({ ticketId }: ProjectTicketInput): Promise<void> {
    const history = await this.eventLog.load(ticketId);
    if (history.length > 0) {
      await this.index.index(projectTicketView(history));
    }
  }
}
