import { INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import request from "supertest";
import { AppModule } from "../../src/app.module";
import { CONTAINER } from "../../src/infrastructure/di/composition.module";
import { buildTestContainer, tokens } from "./test-container";

describe("users api", () => {
  let app: INestApplication;
  let adminAuth: string;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(CONTAINER)
      .useValue(await buildTestContainer())
      .compile();
    app = moduleRef.createNestApplication();
    await app.init();
    adminAuth = `Bearer ${await tokens.sign({ sub: "admin-1", roles: ["admin"] })}`;
  });

  afterAll(async () => {
    await app.close();
  });

  it("creates a user", async () => {
    const response = await request(app.getHttpServer())
      .post("/users")
      .set("Authorization", adminAuth)
      .send({ email: "ada@example.com", name: "Ada" });

    expect(response.status).toBe(201);
    expect(response.body).toMatchObject({ email: "ada@example.com", name: "Ada" });
  });

  it("reads a created user through the query side", async () => {
    const created = await request(app.getHttpServer())
      .post("/users")
      .set("Authorization", adminAuth)
      .send({ email: "grace@example.com", name: "Grace" });
    const found = await request(app.getHttpServer()).get(`/users/${created.body.id}`).set("Authorization", adminAuth);

    expect(found.body).toMatchObject({ email: "grace@example.com" });
    expect((await request(app.getHttpServer()).get("/users/missing").set("Authorization", adminAuth)).status).toBe(404);
  });

  it("rejects invalid input", async () => {
    const response = await request(app.getHttpServer())
      .post("/users")
      .set("Authorization", adminAuth)
      .send({ email: "not-an-email" });

    expect(response.status).toBe(400);
  });

  it("protects /me with a bearer token", async () => {
    const token = await tokens.sign({ sub: "1", roles: ["admin"] });

    expect((await request(app.getHttpServer()).get("/me")).status).toBe(401);
    const allowed = await request(app.getHttpServer()).get("/me").set("Authorization", `Bearer ${token}`);
    expect(allowed.body).toEqual({ sub: "1", roles: ["admin"] });
  });

  it("requires an admin token to create users", async () => {
    const agent = `Bearer ${await tokens.sign({ sub: "2", roles: ["support-agent"] })}`;
    const body = { email: "linus@example.com", name: "Linus" };

    expect((await request(app.getHttpServer()).post("/users").send(body)).status).toBe(401);
    expect((await request(app.getHttpServer()).post("/users").set("Authorization", agent).send(body)).status).toBe(403);
    expect((await request(app.getHttpServer()).post("/users").set("Authorization", adminAuth).send(body)).status).toBe(201);
  });

  describe("oauth token endpoint", () => {
    const credentials = { email: "alan@example.com", name: "Alan", role: "specialist-agent", password: "long-enough-password" };

    const login = (body: object) => request(app.getHttpServer()).post("/oauth/token").send(body);
    const refresh = (refreshToken: string) => login({ grant_type: "refresh_token", refresh_token: refreshToken });

    beforeAll(async () => {
      const created = await request(app.getHttpServer()).post("/users").set("Authorization", adminAuth).send(credentials);
      expect(created.status).toBe(201);
      expect(JSON.stringify(created.body)).not.toContain(credentials.password);
    });

    it("issues a token pair for valid credentials", async () => {
      const response = await request(app.getHttpServer())
        .post("/oauth/token")
        .type("form")
        .send({ grant_type: "password", username: credentials.email, password: credentials.password });

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({ token_type: "Bearer", expires_in: 900 });
      expect(await tokens.verify(response.body.access_token)).toMatchObject({ roles: ["specialist-agent"] });
    });

    it("rejects bad credentials, malformed requests and unsupported grants", async () => {
      const badPassword = await login({ grant_type: "password", username: credentials.email, password: "nope" });
      const missing = await login({ grant_type: "refresh_token" });
      const unsupported = await login({ grant_type: "client_credentials" });

      expect([badPassword.status, badPassword.body]).toEqual([400, { error: "invalid_grant" }]);
      expect(missing.body).toEqual({ error: "invalid_request" });
      expect(unsupported.body).toEqual({ error: "unsupported_grant_type" });
    });

    it("rotates refresh tokens and revokes the family on reuse", async () => {
      const first = (await login({ grant_type: "password", username: credentials.email, password: credentials.password })).body;
      const second = await refresh(first.refresh_token);
      const replay = await refresh(first.refresh_token);
      const afterReplay = await refresh(second.body.refresh_token);

      expect(second.status).toBe(200);
      expect(second.body.refresh_token).not.toBe(first.refresh_token);
      expect(replay.body).toEqual({ error: "invalid_grant" });
      expect(afterReplay.body).toEqual({ error: "invalid_grant" });
    });
  });
});
