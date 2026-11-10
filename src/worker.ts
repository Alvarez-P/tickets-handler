import "reflect-metadata";
import "dotenv/config";
import "./infrastructure/observability/tracing";
import { startWorker } from "./infrastructure/di/worker";
import { logger } from "./shared/logging/logger";

const bootstrap = async (): Promise<void> => {
  const worker = await startWorker();
  const shutdown = (): void => {
    worker
      .stop()
      .then(() => process.exit(0))
      .catch((error: unknown) => {
        logger.error(error);
        process.exit(1);
      });
  };
  process.once("SIGTERM", shutdown);
  process.once("SIGINT", shutdown);
  logger.info("worker started");
};

bootstrap().catch((error: unknown) => {
  logger.error(error);
  process.exit(1);
});
