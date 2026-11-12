import { TicketEventLog } from "../../../domain/repositories/ticket-event-log";
import { UseCase } from "../../use-case";
import { ProjectTicketInput } from "./project-ticket.use-case";

const DEFAULT_BATCH_SIZE = 200;

export interface ReindexTicketsInput {
  batchSize?: number;
}

export class ReindexTickets implements UseCase<ReindexTicketsInput, number> {
  constructor(
    private readonly eventLog: TicketEventLog,
    private readonly projectTicket: UseCase<ProjectTicketInput, void>,
  ) {}

  async execute({ batchSize = DEFAULT_BATCH_SIZE }: ReindexTicketsInput = {}): Promise<number> {
    const startPosition = await this.eventLog.maxPosition();
    let projected = 0;
    let cursor: string | null = null;
    for (;;) {
      const ids = await this.eventLog.listTicketIds(cursor, batchSize);
      for (const ticketId of ids) {
        await this.projectTicket.execute({ ticketId });
      }
      projected += ids.length;
      const last = ids.at(-1);
      if (last === undefined || ids.length < batchSize) {
        break;
      }
      cursor = last;
    }
    for (const ticketId of await this.eventLog.ticketIdsSince(startPosition)) {
      await this.projectTicket.execute({ ticketId });
    }
    return projected;
  }
}
