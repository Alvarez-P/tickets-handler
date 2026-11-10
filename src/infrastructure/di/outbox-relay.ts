import { OutboxMessage } from "../../shared/contracts/outbox";
import { OutboxRelay } from "../outbox/outbox-relay";
import { createMessagePublisher } from "./messaging";
import { createPersistence } from "./persistence";

const keyOfMessage = ({ payload }: OutboxMessage): string | undefined =>
  typeof payload === "object" && payload !== null && "agentId" in payload && typeof payload.agentId === "string"
    ? payload.agentId
    : undefined;

export interface RunningOutboxRelay {
  start(): void;
  stop(): Promise<void>;
}

export const createOutboxRelay = async (): Promise<RunningOutboxRelay> => {
  const persistence = await createPersistence();
  const messaging = await createMessagePublisher();
  const relay = new OutboxRelay(persistence.outbox, messaging.publisher, undefined, undefined, keyOfMessage);
  return {
    start: () => relay.start(),
    stop: async () => {
      relay.stop();
      await messaging.close();
      await persistence.close();
    },
  };
};
