import { closeDrizzle, getDrizzleClient } from "../outbound/persistence/database";
import { DrizzleOutbox } from "../outbound/persistence/drizzle-outbox";
import { DrizzleUnitOfWork } from "../outbound/persistence/drizzle-unit-of-work";
import { DrizzleUserRepository } from "../outbound/persistence/drizzle-user.repository";
import { Persistence } from "./persistence-handle";

export const createPersistence = async (): Promise<Persistence> => {
  const client = getDrizzleClient();
  return {
    repository: new DrizzleUserRepository(client),
    unitOfWork: new DrizzleUnitOfWork(client),
    outbox: new DrizzleOutbox(client),
    close: closeDrizzle,
  };
};
