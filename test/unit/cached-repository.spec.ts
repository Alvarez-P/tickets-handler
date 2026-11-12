import { CachedRepository } from "../../src/infrastructure/outbound/cache/cached-repository";
import { User } from "../../src/domain/entities/user";
import { InMemoryCache } from "../../src/shared/testing/in-memory-cache";
import { InMemoryRepository } from "../../src/shared/testing/in-memory-repository";

describe("CachedRepository", () => {
  const user: User = { id: "1", email: "ada@example.com", name: "Ada", role: "support-agent", status: "invited" };

  it("serves reads from the cache after a save", async () => {
    const source = new InMemoryRepository<User>();
    const cache = new InMemoryCache();
    const repository = new CachedRepository(source, cache, "user");

    await repository.save(user);
    await source.remove(user.id);

    expect(await repository.findById(user.id)).toEqual(user);
  });

  it("evicts the cache entry on remove", async () => {
    const repository = new CachedRepository(new InMemoryRepository<User>(), new InMemoryCache(), "user");

    await repository.save(user);
    await repository.remove(user.id);

    expect(await repository.findById(user.id)).toBeNull();
  });
});
