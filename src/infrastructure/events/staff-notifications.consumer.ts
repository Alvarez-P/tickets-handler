import { AgentCreated, STAFF_EVENTS_TOPIC } from "../../domain/events/staff-events";
import { EventEnvelope } from "../../shared/contracts/event-envelope";
import { InboxStore } from "../../shared/contracts/inbox";
import { MessageConsumer } from "../../shared/contracts/message-consumer";
import { MessagePublisher } from "../../shared/contracts/message-publisher";
import { UseCase } from "../../shared/contracts/use-case";
import { SendAgentInvitationInput } from "../../application/use-cases/staff/send-agent-invitation.use-case";
import { resilientHandler } from "./resilient-handler";

export const STAFF_NOTIFICATIONS_GROUP = "staff-notifications";

export interface StaffNotificationsDependencies {
  consumer: MessageConsumer;
  inbox: InboxStore;
  publisher: MessagePublisher;
  sendAgentInvitation: UseCase<SendAgentInvitationInput, void>;
  backoff?: { baseDelayMs?: number; maxDelayMs?: number };
}

const isAgentCreated = (envelope: EventEnvelope): envelope is EventEnvelope & AgentCreated =>
  envelope.type === "agent.created" && "agentId" in envelope && typeof envelope.agentId === "string";

export const startStaffNotificationsConsumer = async ({
  consumer,
  inbox,
  publisher,
  sendAgentInvitation,
  backoff,
}: StaffNotificationsDependencies): Promise<void> => {
  await consumer.subscribe<EventEnvelope>(
    STAFF_EVENTS_TOPIC,
    resilientHandler({
      consumer: STAFF_NOTIFICATIONS_GROUP,
      inbox,
      publisher,
      backoff,
      handle: async (envelope) => {
        if (isAgentCreated(envelope)) {
          await sendAgentInvitation.execute({ agentId: envelope.agentId });
        }
      },
    }),
  );
  await consumer.start();
};
