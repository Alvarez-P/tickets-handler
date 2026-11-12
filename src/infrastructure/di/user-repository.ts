import { closeDrizzle, getDrizzleClient } from "../persistence/database";
import { DrizzleUserRepository } from "../persistence/drizzle-user.repository";
import { UserRepositoryHandle } from "./user-repository-handle";

export const createUserRepository = async (): Promise<UserRepositoryHandle> => ({
  repository: new DrizzleUserRepository(getDrizzleClient()),
  close: closeDrizzle,
});
