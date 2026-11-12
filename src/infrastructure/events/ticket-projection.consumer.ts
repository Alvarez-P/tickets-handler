import { ProjectTicketInput } from "../../application/use-cases/tickets/project-ticket.use-case";
import { TICKET_EVENTS_TOPIC, TicketEventMessage } from "../../domain/events/ticket-events";
import { InboxStore } from "./inbox";
import { MessageConsumer } from "../messaging/message-consumer";
import { MessagePublisher } from "../messaging/message-publisher";
import { UseCase } from "../../application/use-case";
import { resilientHandler } from "./resilient-handler";

export const TICKET_PROJECTION_GROUP = "ticket-projection";

export interface TicketProjectionDependencies {
  consumer: MessageConsumer;
  inbox: InboxStore;
  publisher: MessagePublisher;
  projectTicket: UseCase<ProjectTicketInput, void>;
  backoff?: { baseDelayMs?: number; maxDelayMs?: number };
}

export const startTicketProjectionConsumer = async ({
  consumer,
  inbox,
  publisher,
  projectTicket,
  backoff,
}: TicketProjectionDependencies): Promise<void> => {
  await consumer.subscribe<TicketEventMessage>(
    TICKET_EVENTS_TOPIC,
    resilientHandler({
      consumer: TICKET_PROJECTION_GROUP,
      inbox,
      publisher,
      backoff,
      handle: (message) => projectTicket.execute({ ticketId: message.ticketId }),
    }),
  );
  await consumer.start();
};
