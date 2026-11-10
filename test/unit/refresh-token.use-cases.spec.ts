import { IssueTokenPair } from "../../src/application/use-cases/auth/issue-token-pair.use-case";
import { RotateRefreshToken } from "../../src/application/use-cases/auth/rotate-refresh-token.use-case";
import { InvalidRefreshToken } from "../../src/domain/errors/auth-errors";
import { JoseTokenService } from "../../src/infrastructure/auth/jose-token-service";
import { UserRecord } from "../../src/shared/contracts/user-record";
import { FixedClock, InMemoryRefreshTokenStore } from "../../src/shared/testing/in-memory-auth-stores";
import { InMemoryRepository } from "../../src/shared/testing/in-memory-repository";

const SECONDS_PER_DAY = 86_400;

const build = async () => {
  const tokens = new JoseTokenService("test-secret-test-secret-test-secret-1234");
  const store = new InMemoryRefreshTokenStore();
  const clock = new FixedClock(new Date("2026-01-01T00:00:00Z"));
  const users = new InMemoryRepository<UserRecord>();
  await users.save({ id: "u1", email: "ada@example.com", name: "Ada", role: "specialist-agent", status: "active" });
  const issue = new IssueTokenPair(tokens, store, clock, { accessTtlSeconds: 900, refreshTtlDays: 7 });
  const rotate = new RotateRefreshToken(store, users, issue, clock);
  return { tokens, store, clock, users, issue, rotate };
};

describe("IssueTokenPair", () => {
  it("issues a bearer pair whose access token carries sub and roles and whose refresh token is stored hashed", async () => {
    const { tokens, store, issue } = await build();

    const pair = await issue.execute({ userId: "u1", roles: ["admin"] });

    expect(pair).toMatchObject({ token_type: "Bearer", expires_in: 900 });
    expect(await tokens.verify(pair.access_token)).toEqual({ sub: "u1", roles: ["admin"] });
    expect((await store.rotate(pair.refresh_token, new Date("2026-01-01T00:00:00Z"))).status).toBe("invalid");
  });
});

describe("RotateRefreshToken", () => {
  it("rotates into a new pair with fresh roles in the same family", async () => {
    const { tokens, rotate, issue } = await build();
    const first = await issue.execute({ userId: "u1", roles: ["admin"] });

    const second = await rotate.execute({ refreshToken: first.refresh_token });

    expect(second.refresh_token).not.toBe(first.refresh_token);
    expect((await tokens.verify(second.access_token)).roles).toEqual(["specialist-agent"]);
  });

  it("revokes the whole family when a rotated token is reused", async () => {
    const { rotate, issue } = await build();
    const first = await issue.execute({ userId: "u1", roles: ["admin"] });
    const second = await rotate.execute({ refreshToken: first.refresh_token });

    await expect(rotate.execute({ refreshToken: first.refresh_token })).rejects.toBeInstanceOf(InvalidRefreshToken);
    await expect(rotate.execute({ refreshToken: second.refresh_token })).rejects.toBeInstanceOf(InvalidRefreshToken);
  });

  it("rejects unknown and expired tokens", async () => {
    const { rotate, issue, clock } = await build();
    const pair = await issue.execute({ userId: "u1", roles: ["admin"] });

    await expect(rotate.execute({ refreshToken: "unknown" })).rejects.toBeInstanceOf(InvalidRefreshToken);
    clock.advanceSeconds(8 * SECONDS_PER_DAY);
    await expect(rotate.execute({ refreshToken: pair.refresh_token })).rejects.toBeInstanceOf(InvalidRefreshToken);
  });

  it("rejects and revokes when the user is no longer active", async () => {
    const { rotate, issue, users } = await build();
    const pair = await issue.execute({ userId: "u1", roles: ["admin"] });
    await users.save({ id: "u1", email: "ada@example.com", name: "Ada", role: "admin", status: "disabled" });

    await expect(rotate.execute({ refreshToken: pair.refresh_token })).rejects.toBeInstanceOf(InvalidRefreshToken);
  });
});
