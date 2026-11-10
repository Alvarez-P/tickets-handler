import { ScryptPasswordHasher } from "../../src/infrastructure/auth/scrypt-password-hasher";
import { CreateUser } from "../../src/application/use-cases/create-user.use-case";
import { UserRecord } from "../../src/shared/contracts/user-record";
import { InMemoryCredentialStore } from "../../src/shared/testing/in-memory-auth-stores";
import { InMemoryRepository } from "../../src/shared/testing/in-memory-repository";
import { InMemoryUnitOfWork } from "../../src/shared/testing/in-memory-unit-of-work";

describe("CreateUser", () => {
  it("persists the user with a generated id", async () => {
    const users = new InMemoryRepository<UserRecord>();
    const created = await new CreateUser(new InMemoryUnitOfWork(users), new ScryptPasswordHasher()).execute({ email: "ada@example.com", name: "Ada" });

    expect(created.id).toBeTruthy();
    expect(await users.findById(created.id)).toEqual(created);
  });

  it("makes the user queryable by email", async () => {
    const users = new InMemoryRepository<UserRecord>();
    await new CreateUser(new InMemoryUnitOfWork(users), new ScryptPasswordHasher()).execute({ email: "ada@example.com", name: "Ada" });

    const page = await users.find({ where: { email: "ada@example.com" } });

    expect(page.total).toBe(1);
  });

  it("queues a user.created message in the same unit of work", async () => {
    const unitOfWork = new InMemoryUnitOfWork(new InMemoryRepository<UserRecord>());
    const created = await new CreateUser(unitOfWork, new ScryptPasswordHasher()).execute({ email: "ada@example.com", name: "Ada" });

    expect(unitOfWork.messages).toEqual([{ topic: "user.created", payload: created }]);
  });
});

describe("CreateUser credentials", () => {
  it("defaults to an invited support agent without credentials", async () => {
    const users = new InMemoryRepository<UserRecord>();
    const created = await new CreateUser(new InMemoryUnitOfWork(users), new ScryptPasswordHasher()).execute({
      email: "ada@example.com",
      name: "Ada",
    });

    expect(created).toMatchObject({ role: "support-agent", status: "invited" });
  });

  it("activates the user and stores a hashed password when one is given", async () => {
    const users = new InMemoryRepository<UserRecord>();
    const credentials = new InMemoryCredentialStore(users);
    const created = await new CreateUser(new InMemoryUnitOfWork(users, credentials), new ScryptPasswordHasher()).execute({
      email: "ada@example.com",
      name: "Ada",
      role: "admin",
      password: "s3cret-password",
    });

    const stored = await credentials.find("ada@example.com");
    expect(created).toMatchObject({ role: "admin", status: "active" });
    expect(stored?.hash).not.toContain("s3cret-password");
    expect(created).not.toHaveProperty("password");
  });
});
