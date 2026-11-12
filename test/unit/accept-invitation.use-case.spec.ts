import { AcceptInvitation } from "../../src/application/use-cases/auth/accept-invitation.use-case";
import { VerifyCredentials } from "../../src/application/use-cases/auth/verify-credentials.use-case";
import { InvalidCredentials, InvalidInvitation } from "../../src/domain/errors/auth-errors";
import { ScryptPasswordHasher } from "../../src/infrastructure/outbound/security/scrypt-password-hasher";
import { User } from "../../src/domain/entities/user";
import { CryptoUtils } from "../../src/shared/utils/crypto";
import { FakeCacheInvalidator } from "../../src/shared/testing/fake-cache-invalidator";
import { FixedClock, InMemoryCredentialStore } from "../../src/shared/testing/in-memory-auth-stores";
import { InMemoryInvitationStore } from "../../src/shared/testing/in-memory-invitation-store";
import { InMemoryRepository } from "../../src/shared/testing/in-memory-repository";
import { InMemoryUnitOfWork } from "../../src/shared/testing/in-memory-unit-of-work";

const NOW = new Date("2026-01-01T00:00:00Z");
const TOKEN = "plain-invitation-token";
const PASSWORD = "a-long-enough-password";

const build = async () => {
  const hasher = new ScryptPasswordHasher();
  const users = new InMemoryRepository<User>();
  await users.save({ id: "a1", email: "ada@example.com", name: "Ada", role: "support-agent", status: "invited" });
  const credentials = new InMemoryCredentialStore(users);
  const invitations = new InMemoryInvitationStore();
  const userCache = new FakeCacheInvalidator();
  const clock = new FixedClock(NOW);
  await invitations.issue("a1", CryptoUtils.sha256(TOKEN), new Date(NOW.getTime() + 3_600_000));
  return {
    users,
    userCache,
    clock,
    accept: new AcceptInvitation(invitations, new InMemoryUnitOfWork(users, credentials), hasher, clock, userCache),
    verify: new VerifyCredentials(credentials, hasher, await hasher.hash("unused")),
  };
};

describe("AcceptInvitation", () => {
  it("stores credentials, activates the user and allows login", async () => {
    const { accept, verify, users, userCache } = await build();

    await expect(verify.execute({ email: "ada@example.com", password: PASSWORD })).rejects.toBeInstanceOf(InvalidCredentials);
    await accept.execute({ token: TOKEN, password: PASSWORD });

    expect((await users.findById("a1"))?.status).toBe("active");
    expect(await verify.execute({ email: "ada@example.com", password: PASSWORD })).toEqual({
      userId: "a1",
      roles: ["support-agent"],
    });
    expect(userCache.invalidated).toEqual(["a1"]);
  });

  it("rejects a token that was already used", async () => {
    const { accept } = await build();

    await accept.execute({ token: TOKEN, password: PASSWORD });

    await expect(accept.execute({ token: TOKEN, password: PASSWORD })).rejects.toBeInstanceOf(InvalidInvitation);
  });

  it("rejects an expired token", async () => {
    const { accept, clock } = await build();

    clock.advanceSeconds(7200);

    await expect(accept.execute({ token: TOKEN, password: PASSWORD })).rejects.toBeInstanceOf(InvalidInvitation);
  });

  it("rejects an unknown token", async () => {
    const { accept } = await build();

    await expect(accept.execute({ token: "other", password: PASSWORD })).rejects.toBeInstanceOf(InvalidInvitation);
  });
});
