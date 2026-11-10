import { INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import request from "supertest";
import { AppModule } from "../../src/app.module";
import { SendAgentInvitation } from "../../src/application/use-cases/staff/send-agent-invitation.use-case";
import { CONTAINER } from "../../src/infrastructure/di/composition.module";
import { FixedClock } from "../../src/shared/testing/in-memory-auth-stores";
import { TestEnvironment, buildTestEnvironment, tokens } from "./test-container";

const PASSWORD = "a-long-enough-password";

describe("agent invitations", () => {
  let app: INestApplication;
  let environment: TestEnvironment;
  let admin: string;

  beforeAll(async () => {
    environment = await buildTestEnvironment();
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(CONTAINER)
      .useValue(environment.container)
      .compile();
    app = moduleRef.createNestApplication();
    await app.init();
    admin = `Bearer ${await tokens.sign({ sub: "admin-1", roles: ["admin"] })}`;
  });

  afterAll(async () => {
    await app.close();
  });

  it("rejects a short password and an unknown token with 400", async () => {
    const short = await request(app.getHttpServer()).post("/invitations/accept").send({ token: "x", password: "short" });
    const unknown = await request(app.getHttpServer()).post("/invitations/accept").send({ token: "x", password: PASSWORD });

    expect(short.status).toBe(400);
    expect(unknown.status).toBe(400);
    expect(unknown.body.code).toBe("invalid_invitation");
  });

  it("lets an invited agent set a password and obtain a token", async () => {
    const specialty = await request(app.getHttpServer())
      .post("/admin/specialties")
      .set("Authorization", admin)
      .send({ code: "billing-l1", name: "Billing", ticketType: "billing" });
    const created = await request(app.getHttpServer())
      .post("/admin/agents")
      .set("Authorization", admin)
      .send({ email: "grace@example.com", name: "Grace", role: "support-agent", specialtyIds: [specialty.body.id] });
    expect(created.status).toBe(201);

    const beforeAccept = await request(app.getHttpServer())
      .post("/oauth/token")
      .type("form")
      .send({ grant_type: "password", username: "grace@example.com", password: PASSWORD });
    expect(beforeAccept.status).toBe(400);

    const sender = new SendAgentInvitation(
      environment.container.staff.agents,
      environment.invitations,
      environment.emails,
      new FixedClock(new Date()),
      { publicUrl: "https://app.example.com", ttlHours: 24 },
    );
    await sender.execute({ agentId: created.body.id });
    const link = environment.emails.sent[0].text.match(/https?:\/\/\S+/)?.[0] ?? "";
    const token = new URL(link).searchParams.get("token");

    const accepted = await request(app.getHttpServer()).post("/invitations/accept").send({ token, password: PASSWORD });
    const reused = await request(app.getHttpServer()).post("/invitations/accept").send({ token, password: PASSWORD });
    const login = await request(app.getHttpServer())
      .post("/oauth/token")
      .type("form")
      .send({ grant_type: "password", username: "grace@example.com", password: PASSWORD });

    expect(accepted.status).toBe(204);
    expect(reused.status).toBe(400);
    expect(login.status).toBe(200);
    expect(login.body.access_token).toBeDefined();
  });
});
