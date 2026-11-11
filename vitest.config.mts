import { defineConfig } from "vitest/config";
import swc from "unplugin-swc";

export default defineConfig({
  plugins: [swc.vite()],
  test: {
    globals: true,
    environment: "node",
    passWithNoTests: true,
    projects: [
      { extends: true, test: { name: "unit", include: ["test/unit/**/*.spec.ts"] } },
      { extends: true, test: { name: "e2e", include: ["test/e2e/**/*.spec.ts"] } },
      {
        extends: true,
        test: {
          name: "integration",
          include: ["test/integration/**/*.spec.ts"],
          testTimeout: 90_000,
          hookTimeout: 90_000,
          fileParallelism: false,
          env: {
            NODE_ENV: "test",
            DATABASE_URL: process.env.IT_DATABASE_URL ?? "postgresql://postgres:postgres@localhost:5433/tickets_it",
            KAFKA_BROKERS: process.env.KAFKA_BROKERS ?? "localhost:9092",
            ELASTICSEARCH_URL: process.env.ELASTICSEARCH_URL ?? "http://localhost:9200",
            REDIS_URL: process.env.REDIS_URL ?? "redis://localhost:6379",
            JWT_SECRET: "integration-secret-integration-secret-1234",
            SMTP_HOST: "localhost",
            SMTP_PORT: "1025",
            LOG_LEVEL: "warn",
          },
        },
      },
    ],
  },
});
