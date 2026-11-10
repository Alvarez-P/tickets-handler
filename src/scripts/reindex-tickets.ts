import "reflect-metadata";
import "dotenv/config";
import { Client } from "@elastic/elasticsearch";
import { ProjectTicket } from "../application/use-cases/tickets/project-ticket.use-case";
import { ReindexTickets } from "../application/use-cases/tickets/reindex-tickets.use-case";
import { requireElasticsearchUrl } from "../shared/config/environment";
import { logger } from "../shared/logging/logger";
import { createTicketSearchIndex } from "../infrastructure/di/search";
import { closeDrizzle, getDrizzleClient } from "../infrastructure/persistence/database";
import { DrizzleTicketEventLog } from "../infrastructure/persistence/drizzle-ticket-event-log";

const TICKETS_INDEX = "tickets";

const reindex = async (): Promise<void> => {
  const recreate = process.argv.includes("--recreate");
  const elasticsearch = new Client({ node: requireElasticsearchUrl() });
  try {
    if (recreate) {
      await elasticsearch.indices.delete({ index: TICKETS_INDEX }, { ignore: [404] });
    }
    const eventLog = new DrizzleTicketEventLog(getDrizzleClient());
    const index = await createTicketSearchIndex(elasticsearch);
    const projected = await new ReindexTickets(eventLog, new ProjectTicket(eventLog, index)).execute();
    logger.info({ projected, recreate }, "tickets reindexed");
  } finally {
    await elasticsearch.close();
    await closeDrizzle();
  }
};

reindex().catch((error: unknown) => {
  logger.error(error);
  process.exit(1);
});
