import "reflect-metadata";
import "dotenv/config";
import "./infrastructure/observability/tracing";
import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";
import { environment } from "./shared/config/environment";
import { createUserSearchIndex } from "./infrastructure/di/search";
import { ProjectUser } from "./application/use-cases/project-user.use-case";
import { createOutboxRelay } from "./infrastructure/di/outbox-relay";
import { createMessageConsumer } from "./infrastructure/di/messaging";
import { messagingConfig } from "./infrastructure/messaging/messaging-config";
import { startEventConsumers } from "./infrastructure/events/event-consumers";

const bootstrap = async (): Promise<void> => {
  const app = await NestFactory.create(AppModule);
  app.enableShutdownHooks();
  await app.listen(environment.port);
  const outboxRelay = await createOutboxRelay();
  outboxRelay.start();
  process.once("SIGTERM", () => void outboxRelay.stop());
  process.once("SIGINT", () => void outboxRelay.stop());
  const searchIndex = await createUserSearchIndex();
  const consumer = await createMessageConsumer(messagingConfig.groupId);
  await startEventConsumers(consumer, new ProjectUser(searchIndex));
  process.once("SIGTERM", () => void consumer.close());
  process.once("SIGINT", () => void consumer.close());
  process.once("SIGTERM", () => void searchIndex.close());
  process.once("SIGINT", () => void searchIndex.close());
};

void bootstrap();
