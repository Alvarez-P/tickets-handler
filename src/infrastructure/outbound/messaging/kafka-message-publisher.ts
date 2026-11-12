import { Kafka, Producer } from "kafkajs";
import { MessagePublisher, PublishOptions } from "./message-publisher";

export class KafkaMessagePublisher implements MessagePublisher {
  private readonly producer: Producer;

  constructor(brokers: readonly string[], clientId: string) {
    this.producer = new Kafka({ clientId, brokers: [...brokers] }).producer();
  }

  connect(): Promise<void> {
    return this.producer.connect();
  }

  disconnect(): Promise<void> {
    return this.producer.disconnect();
  }

  async publish<TPayload>(topic: string, payload: TPayload, options: PublishOptions = {}): Promise<void> {
    await this.producer.send({ topic, messages: [{ key: options.key ?? null, value: JSON.stringify(payload) }] });
  }
}
