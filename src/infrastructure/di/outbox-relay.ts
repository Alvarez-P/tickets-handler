import { agentIdKey, OutboxRelay } from "../outbound/outbox/outbox-relay";
import { createMessagePublisher } from "./messaging";
import { createPersistence } from "./persistence";

export interface RunningOutboxRelay {
  start(): void;
  stop(): Promise<void>;
}

export const createOutboxRelay = async (): Promise<RunningOutboxRelay> => {
  const persistence = await createPersistence();
  const messaging = await createMessagePublisher();
  const relay = new OutboxRelay(persistence.outbox, messaging.publisher, undefined, undefined, agentIdKey);
  return {
    start: () => relay.start(),
    stop: async () => {
      relay.stop();
      await messaging.close();
      await persistence.close();
    },
  };
};
