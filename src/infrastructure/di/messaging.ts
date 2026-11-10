import { KafkaMessageConsumer } from "../messaging/kafka-message-consumer";
import { KafkaMessagePublisher } from "../messaging/kafka-message-publisher";
import { messagingConfig } from "../messaging/messaging-config";
import { MessageConsumer } from "../../shared/contracts/message-consumer";
import { MessagePublisher } from "../../shared/contracts/message-publisher";

export const createMessagePublisher = async (): Promise<{ publisher: MessagePublisher; close(): Promise<void> }> => {
  const publisher = new KafkaMessagePublisher(messagingConfig.brokers, messagingConfig.clientId);
  await publisher.connect();
  return { publisher, close: () => publisher.disconnect() };
};

export const createMessageConsumer = async (groupId: string): Promise<MessageConsumer> =>
  new KafkaMessageConsumer(messagingConfig.brokers, groupId, `${messagingConfig.clientId}-${groupId}`);
