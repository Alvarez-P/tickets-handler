import { EventEnvelope } from "../../outbound/messaging/event-envelope";
import { InboxStore } from "./inbox";
import { MessageContext, MessageHandler } from "../../outbound/messaging/message-consumer";
import { MessagePublisher } from "../../outbound/messaging/message-publisher";
import { RetryOptions, retry } from "../../../shared/utils/async";

export const DEAD_LETTER_SUFFIX = ".dlq";
const DEFAULT_MAX_ATTEMPTS = 4;

export interface DeadLetter<TEnvelope extends EventEnvelope> {
  envelope: TEnvelope;
  consumer: string;
  error: string;
  attempts: number;
}

export interface ResilientHandlerOptions<TEnvelope extends EventEnvelope> {
  consumer: string;
  inbox: InboxStore;
  publisher: MessagePublisher;
  handle: (envelope: TEnvelope, context: MessageContext) => Promise<void>;
  backoff?: Pick<RetryOptions, "baseDelayMs" | "maxDelayMs">;
  maxAttempts?: number;
}

const describeError = (error: unknown): string => (error instanceof Error ? error.message : String(error));

export const resilientHandler = <TEnvelope extends EventEnvelope>({
  consumer,
  inbox,
  publisher,
  handle,
  backoff,
  maxAttempts = DEFAULT_MAX_ATTEMPTS,
}: ResilientHandlerOptions<TEnvelope>): MessageHandler<TEnvelope> => {
  return async (envelope, context) => {
    if (await inbox.has(consumer, envelope.eventId)) {
      return;
    }
    try {
      await retry(() => handle(envelope, context), { ...backoff, attempts: maxAttempts });
    } catch (error) {
      const deadLetter: DeadLetter<TEnvelope> = {
        envelope,
        consumer,
        error: describeError(error),
        attempts: maxAttempts,
      };
      await publisher.publish(`${context.topic}${DEAD_LETTER_SUFFIX}`, deadLetter, { key: context.key });
      return;
    }
    await inbox.mark(consumer, envelope.eventId);
  };
};
