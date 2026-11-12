import { ThrottlerStorage } from "@nestjs/throttler";
import { RedisThrottlerStorage } from "../../src/infrastructure/inbound/rate-limit/redis-throttler-storage";

const fakeClient = () => {
  const hits = new Map<string, number>();
  const calls: unknown[][] = [];
  return {
    calls,
    eval: async (_script: string, _keys: number, ...args: (string | number)[]) => {
      calls.push(args);
      const key = String(args[0]);
      const total = (hits.get(key) ?? 0) + 1;
      hits.set(key, total);
      return [total, 1500];
    },
  };
};

describe("RedisThrottlerStorage", () => {
  it("counts hits and reports expiry in seconds", async () => {
    const client = fakeClient();
    const storage: ThrottlerStorage = new RedisThrottlerStorage(client);

    const record = await storage.increment("k", 60000, 2, 0, "default");

    expect(record).toEqual({ totalHits: 1, timeToExpire: 2, isBlocked: false, timeToBlockExpire: 0 });
    expect(client.calls[0]).toEqual(["throttler:k", 60000]);
  });

  it("blocks once the limit is exceeded", async () => {
    const storage: ThrottlerStorage = new RedisThrottlerStorage(fakeClient());

    await storage.increment("k", 1000, 1, 0, "default");
    const record = await storage.increment("k", 1000, 1, 0, "default");

    expect(record).toMatchObject({ totalHits: 2, isBlocked: true, timeToBlockExpire: 2 });
  });
});
