import { logger } from "../../shared/logging/logger";
import { MessagePublisher } from "../messaging/message-publisher";
import { OutboxMessage, OutboxStore } from "../../application/ports/outbox";

export class OutboxRelay {
  private timer?: NodeJS.Timeout;
  private draining = false;

  constructor(
    private readonly store: OutboxStore,
    private readonly publisher: MessagePublisher,
    private readonly intervalMs: number = 1000,
    private readonly batchSize: number = 50,
    private readonly keyOf?: (message: OutboxMessage) => string | undefined,
  ) {}

  async drain(): Promise<number> {
    const pending = await this.store.claimPending(this.batchSize);
    for (const message of pending) {
      await this.publisher.publish(message.topic, message.payload, { key: this.keyOf?.(message) });
      await this.store.markPublished([message.id]);
    }
    return pending.length;
  }

  start(): void {
    this.timer = setInterval(() => {
      if (this.draining) {
        return;
      }
      this.draining = true;
      this.drain()
        .catch((error: unknown) => logger.error(error))
        .finally(() => {
          this.draining = false;
        });
    }, this.intervalMs);
  }

  stop(): void {
    clearInterval(this.timer);
  }
}
