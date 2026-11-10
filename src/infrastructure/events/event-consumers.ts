import { logger } from "../../shared/logging/logger";
import { MessageConsumer } from "../../shared/contracts/message-consumer";
import { UseCase } from "../../shared/contracts/use-case";
import { UserRecord } from "../../shared/contracts/user-record";

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
