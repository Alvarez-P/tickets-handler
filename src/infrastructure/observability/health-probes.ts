import { Client } from "@elastic/elasticsearch";
import Redis from "ioredis";
import { Kafka } from "kafkajs";
import { Pool } from "pg";
import { HealthProbe } from "../../shared/contracts/health-probe";

export interface HealthProbeSources {
  database: Pick<Pool, "query">;
  redis: Pick<Redis, "ping">;
  elasticsearch: Client;
  kafka: Pick<Kafka, "admin">;
}

const checkKafka = async (kafka: HealthProbeSources["kafka"]): Promise<void> => {
  const admin = kafka.admin();
  await admin.connect();
  try {
    await admin.describeCluster();
  } finally {
    await admin.disconnect();
  }
};

export const createHealthProbes = (sources: HealthProbeSources): HealthProbe[] => [
  { name: "postgres", check: async () => void (await sources.database.query("select 1")) },
  { name: "redis", check: async () => void (await sources.redis.ping()) },
  { name: "elasticsearch", check: async () => void (await sources.elasticsearch.ping()) },
  { name: "kafka", check: () => checkKafka(sources.kafka) },
];
