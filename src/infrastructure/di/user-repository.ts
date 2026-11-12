import { closeDrizzle, getDrizzleClient } from "../outbound/persistence/database";
import { DrizzleUserRepository } from "../outbound/persistence/drizzle-user.repository";
import { UserRepositoryHandle } from "./user-repository-handle";

export const createUserRepository = async (): Promise<UserRepositoryHandle> => ({
  repository: new DrizzleUserRepository(getDrizzleClient()),
  close: closeDrizzle,
});
