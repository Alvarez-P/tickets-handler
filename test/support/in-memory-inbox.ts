import { InboxStore } from "../../src/infrastructure/inbound/events/inbox";

export class InMemoryInbox implements InboxStore {
  private readonly processed = new Set<string>();

  async has(consumer: string, eventId: string): Promise<boolean> {
    return this.processed.has(`${consumer}:${eventId}`);
  }

  async mark(consumer: string, eventId: string): Promise<void> {
    this.processed.add(`${consumer}:${eventId}`);
  }
}
