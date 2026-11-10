import "reflect-metadata";
import "dotenv/config";
import { randomUUID } from "node:crypto";
import { ScryptPasswordHasher } from "../infrastructure/auth/scrypt-password-hasher";
import { closeDrizzle, getDrizzleClient } from "../infrastructure/persistence/database";
import { DrizzleCredentialStore } from "../infrastructure/persistence/drizzle-credential-store";
import { DrizzleUserRepository } from "../infrastructure/persistence/drizzle-user.repository";

const ADMIN_NAME = "Administrator";

const requireVariable = (name: string): string => {
  const value = process.env[name];
  if (!value) {
    throw new Error(`La variable de entorno ${name} no está definida`);
  }
  return value;
};

const seedAdmin = async (): Promise<void> => {
  const email = requireVariable("ADMIN_EMAIL");
  const password = requireVariable("ADMIN_PASSWORD");
  const client = getDrizzleClient();
  const users = new DrizzleUserRepository(client);
  const existing = await users.findByEmail(email);
  const admin = await users.save({
    id: existing?.id ?? randomUUID(),
    email,
    name: existing?.name ?? ADMIN_NAME,
    role: "admin",
    status: "active",
  });
  await new DrizzleCredentialStore(client).set(admin.id, await new ScryptPasswordHasher().hash(password));
};

seedAdmin()
  .then(() => closeDrizzle())
  .catch(async (error: unknown) => {
    await closeDrizzle();
    throw error;
  });
