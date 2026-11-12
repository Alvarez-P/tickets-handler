import { logger } from "../../shared/logging/logger";
import { MessageConsumer } from "../messaging/message-consumer";
import { UseCase } from "../../application/use-case";
import { UserRecord } from "../../domain/entities/user";

export const startEventConsumers = async (
  consumer: MessageConsumer,
  projectUser: UseCase<UserRecord, void>,
): Promise<void> => {
  await consumer.subscribe<UserRecord>("user.created", async (user, context) => {
    logger.info({ userId: user.id, partition: context.partition, offset: context.offset }, "user.created received");
    await projectUser.execute(user);
  });
  await consumer.start();
};
