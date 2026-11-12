import { ThrottlerStorage } from "@nestjs/throttler";

type ThrottlerRecord = Awaited<ReturnType<ThrottlerStorage["increment"]>>;

export interface ScriptRunner {
  eval(script: string, numberOfKeys: number, ...args: (string | number)[]): Promise<unknown>;
}

const INCREMENT_SCRIPT = `
local hits = redis.call("INCR", KEYS[1])
if hits == 1 then
  redis.call("PEXPIRE", KEYS[1], ARGV[1])
end
return { hits, redis.call("PTTL", KEYS[1]) }
`;

const MILLISECONDS_PER_SECOND = 1000;

export class RedisThrottlerStorage implements ThrottlerStorage {
  constructor(private readonly client: ScriptRunner) {}

  async increment(key: string, ttl: number, limit: number): Promise<ThrottlerRecord> {
    const reply = await this.client.eval(INCREMENT_SCRIPT, 1, `throttler:${key}`, ttl);
    const [totalHits, remainingMs] = reply as [number, number];
    const timeToExpire = Math.ceil(Math.max(remainingMs, 0) / MILLISECONDS_PER_SECOND);
    const isBlocked = totalHits > limit;
    return { totalHits, timeToExpire, isBlocked, timeToBlockExpire: isBlocked ? timeToExpire : 0 };
  }
}
