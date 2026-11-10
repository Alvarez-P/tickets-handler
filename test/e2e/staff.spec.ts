import { INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import request from "supertest";
import { AppModule } from "../../src/app.module";
import { CONTAINER } from "../../src/infrastructure/di/composition.module";
import { buildTestContainer, tokens } from "./test-container";

describe("staff admin api", () => {
  let app: INestApplication;
  let admin: string;
  let supportAgent: string;

  const send = (method: "post" | "get" | "patch", path: string, auth?: string) => {
    const call = request(app.getHttpServer())[method](path);
    return auth ? call.set("Authorization", auth) : call;
  };

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(CONTAINER)
      .useValue(await buildTestContainer())
      .compile();
    app = moduleRef.createNestApplication();
    await app.init();
    admin = `Bearer ${await tokens.sign({ sub: "admin-1", roles: ["admin"] })}`;
    supportAgent = `Bearer ${await tokens.sign({ sub: "agent-1", roles: ["support-agent"] })}`;
  });

  afterAll(async () => {
    await app.close();
  });

  it("lets an admin manage specialties and agents", async () => {
    const specialty = await send("post", "/admin/specialties", admin).send({
      code: "shipping-l1",
      name: "Shipping",
      ticketType: "shipping",
    });
    const conflict = await send("post", "/admin/specialties", admin).send({
      code: "shipping-l2",
      name: "Shipping 2",
      ticketType: "shipping",
    });
    const deactivated = await send("patch", `/admin/specialties/${specialty.body.id}/active`, admin).send({ active: false });
    const listed = await send("get", "/admin/specialties?active=false", admin);

    expect(specialty.status).toBe(201);
    expect(conflict.status).toBe(409);
    expect(deactivated.body).toMatchObject({ active: false });
    expect(listed.body.total).toBe(1);

    await send("patch", `/admin/specialties/${specialty.body.id}/active`, admin).send({ active: true });
    const agent = await send("post", "/admin/agents", admin).send({
      email: "ada@example.com",
      name: "Ada",
      role: "specialist-agent",
      specialtyIds: [specialty.body.id],
    });
    const found = await send("get", `/admin/agents/${agent.body.id}`, admin);
    const filtered = await send("get", `/admin/agents?role=specialist-agent&specialtyId=${specialty.body.id}`, admin);
    const updated = await send("patch", `/admin/agents/${agent.body.id}`, admin).send({ name: "Ada L." });

    expect(agent.status).toBe(201);
    expect(agent.body).toMatchObject({ status: "invited", specialtyIds: [specialty.body.id] });
    expect(found.body).toEqual(agent.body);
    expect(filtered.body.total).toBe(1);
    expect(updated.body).toMatchObject({ name: "Ada L." });
    for (const response of [agent, found, filtered, updated]) {
      expect(JSON.stringify(response.body)).not.toMatch(/hash|password/i);
    }
  });

  it("maps domain errors and validation failures", async () => {
    const adminRole = await send("post", "/admin/agents", admin).send({
      email: "root@example.com",
      name: "Root",
      role: "admin",
    });
    const missing = await send("get", "/admin/agents/missing", admin);
    const invalid = await send("post", "/admin/agents", admin).send({ email: "nope" });

    expect(adminRole.status).toBe(422);
    expect(missing.status).toBe(404);
    expect(invalid.status).toBe(400);
  });

  it("rejects non-admin and anonymous callers", async () => {
    const body = { code: "x", name: "X", ticketType: "other" };

    expect((await send("post", "/admin/specialties").send(body)).status).toBe(401);
    expect((await send("post", "/admin/specialties", supportAgent).send(body)).status).toBe(403);
    expect((await send("get", "/admin/agents", supportAgent)).status).toBe(403);
    expect((await send("get", "/admin/agents")).status).toBe(401);
  });
});
