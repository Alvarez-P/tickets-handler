import { OutboxRelay } from "../../src/infrastructure/outbox/outbox-relay";
import { MessagePublisher } from "../../src/shared/contracts/message-publisher";
import { OutboxMessage, OutboxStore } from "../../src/shared/contracts/outbox";

class FakeStore implements OutboxStore {
  readonly published: string[] = [];

  constructor(private readonly pending: OutboxMessage[]) {}

  async enqueue(): Promise<void> {
    return undefined;
  }

  async claimPending(limit: number): Promise<OutboxMessage[]> {
    return this.pending.filter((message) => !this.published.includes(message.id)).slice(0, limit);
  }

  async markPublished(ids: string[]): Promise<void> {
    this.published.push(...ids);
  }
}

describe("OutboxRelay", () => {
  it("publishes pending messages once and marks them as published", async () => {
    const sent: { topic: string; payload: unknown }[] = [];
    const publisher: MessagePublisher = {
      publish: async (topic, payload) => {
        sent.push({ topic, payload });
      },
    };
    const store = new FakeStore([{ id: "1", topic: "user.created", payload: { id: "u1" } }]);
    const relay = new OutboxRelay(store, publisher);

    expect(await relay.drain()).toBe(1);
    expect(await relay.drain()).toBe(0);
    expect(sent).toEqual([{ topic: "user.created", payload: { id: "u1" } }]);
  });

  it("keeps a message pending when publishing fails", async () => {
    const publisher: MessagePublisher = {
      publish: async () => {
        throw new Error("broker down");
      },
    };
    const store = new FakeStore([{ id: "1", topic: "user.created", payload: {} }]);

    await expect(new OutboxRelay(store, publisher).drain()).rejects.toThrow("broker down");
    expect(store.published).toEqual([]);
  });
});
