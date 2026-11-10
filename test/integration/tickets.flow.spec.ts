import "reflect-metadata";
import { INestApplication } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { sql } from "drizzle-orm";
import request from "supertest";

const databaseName = (): string => new URL(process.env.DATABASE_URL ?? "").pathname.slice(1);

const eventually = async <TValue>(read: () => Promise<TValue | undefined>, timeoutMs = 45_000): Promise<TValue> => {
  const deadline = Date.now() + timeoutMs;
  for (;;) {
    const value = await read();
    if (value !== undefined) {
      return value;
    }
    if (Date.now() > deadline) {
      throw new Error("Timed out waiting for the projection");
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
};

describe("tickets end to end against the compose stack", () => {
  let app: INestApplication;
  let stopWorker: () => Promise<void>;
  let stopRelay: () => Promise<void>;
  let admin: string;
  let support: string;
  let specialist: string;
  let specialistId: string;

  const send = (method: "post" | "get", path: string, auth: string) =>
    request(app.getHttpServer())[method](path).set("Authorization", auth);

  beforeAll(async () => {
    if (!databaseName().endsWith("_it")) {
      throw new Error("Integration tests only run against a database whose name ends with _it");
    }
    const { AppModule } = await import("../../src/app.module");
    const { getDrizzleClient, closeDrizzle } = await import("../../src/infrastructure/persistence/database");
    const { JoseTokenService } = await import("../../src/infrastructure/auth/jose-token-service");
    const { createOutboxRelay } = await import("../../src/infrastructure/di/outbox-relay");
    const { startWorker } = await import("../../src/infrastructure/di/worker");
    const { users } = await import("../../src/infrastructure/persistence/schema");

    const db = getDrizzleClient();
    await db.execute(
      sql`truncate table users, specialties, agent_specialties, ticket_events, outbox_messages, processed_events cascade`,
    );

    app = await NestFactory.create(AppModule, { logger: false });
    await app.init();
    const relay = await createOutboxRelay();
    relay.start();
    const worker = await startWorker();
    stopRelay = () => relay.stop();
    stopWorker = async () => {
      await worker.stop();
      await closeDrizzle();
    };

    const signer = new JoseTokenService(process.env.JWT_SECRET ?? "");
    const bearer = async (sub: string, role: string) => `Bearer ${await signer.sign({ sub, roles: [role] })}`;
    admin = await bearer("admin-it", "admin");
    support = await bearer("support-it", "support-agent");

    const specialty = await send("post", "/admin/specialties", admin).send({
      code: "billing-it",
      name: "Billing",
      ticketType: "billing",
    });
    const agent = await send("post", "/admin/agents", admin).send({
      email: "bill-it@example.com",
      name: "Bill",
      role: "specialist-agent",
      specialtyIds: [specialty.body.id],
    });
    specialistId = agent.body.id;
    await db.update(users).set({ status: "active" }).where(sql`${users.id} = ${specialistId}`);
    specialist = await bearer(specialistId, "specialist-agent");
  });

  afterAll(async () => {
    await stopRelay?.();
    await app?.close();
    await stopWorker?.();
  });

  it("persists events, publishes through Kafka and serves the projection from Elasticsearch", async () => {
    const token = `zebra${Date.now()}`;
    const received = await send("post", "/tickets", support).send({
      subject: `Cobro duplicado ${token}`,
      description: "Necesito un reembolso urgente",
      customer: { email: "c@x.com", name: "C" },
    });
    expect(received.status).toBe(201);
    expect(received.body).toMatchObject({ status: "assigned", assigneeId: specialistId });

    const path = `/tickets/${received.body.id}`;
    expect((await send("post", `${path}/transitions`, specialist).send({ action: "start-solving" })).status).toBe(201);
    expect(
      (await send("post", `${path}/transitions`, specialist).send({ action: "solve", resolution: "refunded" })).body,
    ).toMatchObject({ status: "solved" });

    const view = await send("get", path, specialist);
    expect(view.body).toMatchObject({ status: "solved", version: 5, assigneeId: specialistId });

    const found = await eventually(async () => {
      const response = await send("get", `/tickets?text=${token}`, support);
      const hit = (response.body.items as { id: string; status: string }[]).find((entry) => entry.id === received.body.id);
      return hit?.status === "solved" ? hit : undefined;
    });
    expect(found).toMatchObject({ id: received.body.id, status: "solved" });

    const listed = await send("get", `/tickets?status=solved&assigneeId=${specialistId}`, support);
    const none = await send("get", `/tickets?status=paused&assigneeId=${specialistId}`, support);
    const scoped = await send("get", "/tickets", specialist);
    expect(listed.body.items.map((view: { id: string }) => view.id)).toContain(received.body.id);
    expect(none.body).toEqual({ items: [], total: 0 });
    const ordered = await send("get", `/tickets?assigneeId=${specialistId}&sortBy=createdAt&order=desc`, support);
    const stamps = ordered.body.items.map((view: { createdAt: string }) => Date.parse(view.createdAt));
    expect(ordered.body.total).toBeGreaterThanOrEqual(1);
    expect(stamps).toEqual([...stamps].sort((a, b) => b - a));
    expect(scoped.body.items.map((view: { id: string }) => view.id)).toContain(received.body.id);
  });
});
