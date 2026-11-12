import "dotenv/config";
import { defineConfig } from "drizzle-kit";

export default defineConfig({
  dialect: "postgresql",
  schema: "./src/infrastructure/outbound/persistence/schema.ts",
  out: "./src/infrastructure/outbound/persistence/migrations",
  dbCredentials: { url: process.env.DATABASE_URL ?? "" },
});
