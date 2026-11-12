export const messagingConfig = {
  brokers: (process.env.KAFKA_BROKERS ?? "localhost:9092").split(","),
  clientId: process.env.KAFKA_CLIENT_ID ?? "app",
  groupId: process.env.KAFKA_GROUP_ID ?? process.env.KAFKA_CLIENT_ID ?? "app",
} as const;
