import { DEAD_LETTER_SUFFIX, resilientHandler } from "../../src/infrastructure/inbound/events/resilient-handler";
import { EventEnvelope } from "../../src/infrastructure/outbound/messaging/event-envelope";
import { MessageContext } from "../../src/infrastructure/outbound/messaging/message-consumer";
import { MessagePublisher, PublishOptions } from "../../src/infrastructure/outbound/messaging/message-publisher";
import { InMemoryInbox } from "../../src/shared/testing/in-memory-inbox";

const CONSUMER = "test-consumer";
const envelope: EventEnvelope = { eventId: "evt-1", type: "agent.created", correlationId: "corr-1" };
const context: MessageContext = { topic: "staff.events", key: "agent-1" };

interface Published {
  topic: string;
  payload: unknown;
  options?: PublishOptions;
}

class RecordingPublisher implements MessagePublisher {
  readonly published: Published[] = [];

  async publish<TPayload>(topic: string, payload: TPayload, options?: PublishOptions): Promise<void> {
    this.published.push({ topic, payload, options });
  }
}

const build = (handle: () => Promise<void>) => {
  const inbox = new InMemoryInbox();
  const publisher = new RecordingPublisher();
  const handler = resilientHandler({
    consumer: CONSUMER,
    inbox,
    publisher,
    handle,
    backoff: { baseDelayMs: 1, maxDelayMs: 2 },
  });
  return { inbox, publisher, handler };
};

describe("resilientHandler", () => {
  it("executes once and marks the event as processed", async () => {
    const handle = vi.fn().mockResolvedValue(undefined);
    const { handler, inbox } = build(handle);

    await handler(envelope, context);

    expect(handle).toHaveBeenCalledTimes(1);
    expect(await inbox.has(CONSUMER, envelope.eventId)).toBe(true);
  });

  it("skips a duplicate without executing", async () => {
    const handle = vi.fn().mockResolvedValue(undefined);
    const { handler } = build(handle);

    await handler(envelope, context);
    await handler(envelope, context);

    expect(handle).toHaveBeenCalledTimes(1);
  });

  it("retries after failures and marks once it succeeds", async () => {
    const handle = vi.fn().mockRejectedValueOnce(new Error("a")).mockRejectedValueOnce(new Error("b")).mockResolvedValue(undefined);
    const { handler, inbox, publisher } = build(handle);

    await handler(envelope, context);

    expect(handle).toHaveBeenCalledTimes(3);
    expect(await inbox.has(CONSUMER, envelope.eventId)).toBe(true);
    expect(publisher.published).toEqual([]);
  });

  it("publishes to the dead letter topic after exhausting attempts and does not mark", async () => {
    const handle = vi.fn().mockRejectedValue(new Error("smtp down"));
    const { handler, inbox, publisher } = build(handle);

    await expect(handler(envelope, context)).resolves.toBeUndefined();

    expect(handle).toHaveBeenCalledTimes(4);
    expect(await inbox.has(CONSUMER, envelope.eventId)).toBe(false);
    expect(publisher.published).toEqual([
      {
        topic: `staff.events${DEAD_LETTER_SUFFIX}`,
        payload: { envelope, consumer: CONSUMER, error: "smtp down", attempts: 4 },
        options: { key: "agent-1" },
      },
    ]);
  });
});
