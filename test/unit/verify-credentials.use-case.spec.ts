import { VerifyCredentials } from "../../src/application/use-cases/auth/verify-credentials.use-case";
import { InvalidCredentials } from "../../src/domain/errors/auth-errors";
import { ScryptPasswordHasher } from "../../src/infrastructure/outbound/security/scrypt-password-hasher";
import { User, UserStatus } from "../../src/domain/entities/user";
import { InMemoryCredentialStore } from "../support/in-memory-auth-stores";
import { InMemoryRepository } from "../support/in-memory-repository";

const PASSWORD = "correct-password";

const build = async (status: UserStatus) => {
  const hasher = new ScryptPasswordHasher();
  const users = new InMemoryRepository<User>();
  const credentials = new InMemoryCredentialStore(users);
  await users.save({ id: "u1", email: "ada@example.com", name: "Ada", role: "admin", status });
  await credentials.set("u1", await hasher.hash(PASSWORD));
  return new VerifyCredentials(credentials, hasher, await hasher.hash("unused"));
};

describe("VerifyCredentials", () => {
  it("returns the user id and roles for valid credentials", async () => {
    const useCase = await build("active");

    expect(await useCase.execute({ email: "ada@example.com", password: PASSWORD })).toEqual({
      userId: "u1",
      roles: ["admin"],
    });
  });

  it("rejects unknown users, bad passwords and inactive users with the same error", async () => {
    const active = await build("active");
    const disabled = await build("disabled");
    const invited = await build("invited");

    const failures = await Promise.all([
      active.execute({ email: "ghost@example.com", password: PASSWORD }).catch((error: unknown) => error),
      active.execute({ email: "ada@example.com", password: "wrong" }).catch((error: unknown) => error),
      disabled.execute({ email: "ada@example.com", password: PASSWORD }).catch((error: unknown) => error),
      invited.execute({ email: "ada@example.com", password: PASSWORD }).catch((error: unknown) => error),
    ]);

    expect(failures.every((failure) => failure instanceof InvalidCredentials)).toBe(true);
  });
});
