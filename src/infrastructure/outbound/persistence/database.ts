import { DrizzleClient, createDrizzleClient } from "./drizzle-client";
import { requireDatabaseUrl } from "../../../shared/config/environment";

let client: DrizzleClient | undefined;

export const getDrizzleClient = (): DrizzleClient => {
  client ??= createDrizzleClient(requireDatabaseUrl());
  return client;
};

export const closeDrizzle = async (): Promise<void> => {
  const current = client;
  client = undefined;
  if (current) {
    await current.$client.end();
  }
};
