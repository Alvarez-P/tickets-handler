import { closeDrizzle, getDrizzleClient } from "../persistence/database";
import { DrizzleOutbox } from "../persistence/drizzle-outbox";
import { DrizzleUnitOfWork } from "../persistence/drizzle-unit-of-work";
import { DrizzleUserRepository } from "../persistence/drizzle-user.repository";
import { Persistence } from "../../shared/contracts/persistence";

export const createPersistence = async (): Promise<Persistence> => {
  const client = getDrizzleClient();
  return {
    repository: new DrizzleUserRepository(client),
    unitOfWork: new DrizzleUnitOfWork(client),
    outbox: new DrizzleOutbox(client),
    close: closeDrizzle,
  };
};
