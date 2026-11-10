import { Consumer, Kafka } from "kafkajs";
import { MessageConsumer, MessageContext, MessageHandler } from "../../shared/contracts/message-consumer";

export class KafkaMessageConsumer implements MessageConsumer {
  private readonly kafka: Kafka;
  private readonly consumer: Consumer;
  private readonly handlers = new Map<string, MessageHandler<unknown>>();
  private started = false;

  constructor(brokers: readonly string[], groupId: string, clientId: string = groupId) {
    this.kafka = new Kafka({ clientId, brokers: [...brokers] });
    this.consumer = this.kafka.consumer({ groupId });
  }

  async subscribe<TPayload>(topic: string, handler: MessageHandler<TPayload>): Promise<void> {
    if (this.started) {
      throw new Error("Suscríbete a todos los topics antes de llamar a start()");
    }
    this.handlers.set(topic, handler as MessageHandler<unknown>);
  }

  async start(): Promise<void> {
    if (this.started || this.handlers.size === 0) {
      return;
    }
    this.started = true;
    await this.ensureTopics();
    await this.consumer.connect();
    for (const topic of this.handlers.keys()) {
      await this.consumer.subscribe({ topic, fromBeginning: false });
    }
    await this.consumer.run({
      eachMessage: async ({ topic, partition, message }) => {
        const handler = this.handlers.get(topic);
        if (!handler || !message.value) {
          return;
        }
        const context: MessageContext = { topic, partition, offset: message.offset, key: message.key?.toString() };
        await handler(JSON.parse(message.value.toString()), context);
      },
    });
  }

  private async ensureTopics(): Promise<void> {
    const admin = this.kafka.admin();
    await admin.connect();
    try {
      await admin.createTopics({ topics: [...this.handlers.keys()].map((topic) => ({ topic })), waitForLeaders: true });
    } finally {
      await admin.disconnect();
    }
  }

  async close(): Promise<void> {
    if (this.started) {
      await this.consumer.disconnect();
    }
  }
}
