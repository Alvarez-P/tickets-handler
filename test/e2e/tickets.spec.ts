import { INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import request from "supertest";
import { AppModule } from "../../src/app.module";
import { CONTAINER } from "../../src/infrastructure/di/composition.module";
import { buildTestEnvironment, tokens } from "./test-container";

describe("tickets api", () => {
  let app: INestApplication;
  let admin: string;
  let support: string;
  let specialist: string;
  let specialistId: string;
  let projectTicket: { execute(input: { ticketId: string }): Promise<void> };

  const send = (method: "post" | "get", path: string, auth?: string) => {
    const call = request(app.getHttpServer())[method](path);
    return auth ? call.set("Authorization", auth) : call;
  };
  const bearer = async (sub: string, role: string) => `Bearer ${await tokens.sign({ sub, roles: [role] })}`;
  const ticket = { subject: "Cobro duplicado", description: "Necesito un reembolso", customer: { email: "c@x.com", name: "C" } };

  beforeAll(async () => {
    const environment = await buildTestEnvironment();
    const container = environment.container;
    projectTicket = environment.projectTicket;
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(CONTAINER)
      .useValue(container)
      .compile();
    app = moduleRef.createNestApplication();
    await app.init();
    admin = await bearer("admin-1", "admin");
    support = await bearer("support-1", "support-agent");
    const specialty = await send("post", "/admin/specialties", admin).send({
      code: "billing",
      name: "Billing",
      ticketType: "billing",
    });
    const agent = await send("post", "/admin/agents", admin).send({
      email: "bill@example.com",
      name: "Bill",
      role: "specialist-agent",
      specialtyIds: [specialty.body.id],
    });
    await container.users.save({ id: agent.body.id, email: "bill@example.com", name: "Bill", role: "specialist-agent", status: "active" });
    specialistId = agent.body.id;
    specialist = await bearer(specialistId, "specialist-agent");
  });

  afterAll(async () => {
    await app.close();
  });

  it("receives a ticket, assigns it and walks it to solved", async () => {
    const received = await send("post", "/tickets", support).send(ticket);
    expect(received.status).toBe(201);
    expect(received.body).toMatchObject({ status: "assigned", assigneeId: specialistId });

    const path = `/tickets/${received.body.id}/transitions`;
    const started = await send("post", path, specialist).send({ action: "start-solving" });
    const solved = await send("post", path, specialist).send({ action: "solve", resolution: "refunded" });
    expect(started.body).toMatchObject({ status: "solving" });
    expect(solved.body).toMatchObject({ status: "solved" });
  });

  it("maps errors and enforces roles", async () => {
    const received = await send("post", "/tickets", support).send(ticket);
    const path = `/tickets/${received.body.id}/transitions`;

    expect((await send("post", "/tickets").send(ticket)).status).toBe(401);
    expect((await send("post", "/tickets", specialist).send(ticket)).status).toBe(403);
    expect((await send("post", "/tickets", support).send({ subject: "" })).status).toBe(400);
    expect((await send("post", path, specialist).send({ action: "bogus" })).status).toBe(400);
    expect((await send("post", path, specialist).send({ action: "cancel", reason: "x" })).status).toBe(403);
    expect((await send("post", path, support).send({ action: "start-solving" })).status).toBe(403);
    expect((await send("post", path, specialist).send({ action: "resume" })).status).toBe(422);
    expect((await send("post", "/tickets/missing/transitions", specialist).send({ action: "resume" })).status).toBe(404);
    expect((await send("post", path, support).send({ action: "cancel", reason: "dup" })).body).toMatchObject({
      status: "canceled",
    });
  });

  it("reads a ticket and searches the projection with role-scoped access", async () => {
    const received = await send("post", "/tickets", support).send({ ...ticket, subject: "Zebra invoice" });
    await projectTicket.execute({ ticketId: received.body.id });

    const own = await send("get", `/tickets/${received.body.id}`, specialist);
    const other = await send("get", `/tickets/${received.body.id}`, await bearer("other", "specialist-agent"));
    const found = await send("get", "/tickets?text=zebra", support);

    expect(own.body).toMatchObject({ id: received.body.id, status: "assigned", subject: "Zebra invoice" });
    expect(other.status).toBe(404);
    expect((await send("get", "/tickets/missing", admin)).status).toBe(404);
    expect(found.body.items.map((view: { id: string }) => view.id)).toEqual([received.body.id]);
    const mine = await send("get", "/tickets", specialist);
    const byStatus = await send("get", "/tickets?status=solved", support);
    const foreign = await send("get", `/tickets?assigneeId=${specialistId}`, await bearer("other", "specialist-agent"));

    expect(mine.body.items.map((view: { id: string }) => view.id)).toContain(received.body.id);
    expect(mine.body.items.every((view: { assigneeId: string }) => view.assigneeId === specialistId)).toBe(true);
    expect(byStatus.body.items.map((view: { id: string }) => view.id)).not.toContain(received.body.id);
    expect(foreign.body).toEqual({ items: [], total: 0 });
    const sorted = await send("get", "/tickets?sortBy=createdAt&order=asc", support);
    expect(sorted.body.total).toBe(sorted.body.items.length);
    expect(sorted.body.items.map((view: { createdAt: string }) => view.createdAt)).toEqual(
      sorted.body.items.map((view: { createdAt: string }) => view.createdAt).sort(),
    );
    expect((await send("get", "/tickets?sortBy=subject", support)).status).toBe(400);
    expect((await send("get", "/tickets?status=bogus", support)).status).toBe(400);
  });
});
