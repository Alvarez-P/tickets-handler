import Redis from "ioredis";
import { Cache } from "../../../application/ports/cache";

export class RedisCache implements Cache {
  readonly client: Redis;

  constructor(url: string) {
    this.client = new Redis(url);
  }

  async get<TValue>(key: string): Promise<TValue | null> {
    const raw = await this.client.get(key);
    return raw === null ? null : (JSON.parse(raw) as TValue);
  }

  async set<TValue>(key: string, value: TValue, ttlSeconds?: number): Promise<void> {
    const raw = JSON.stringify(value);
    if (ttlSeconds === undefined) {
      await this.client.set(key, raw);
      return;
    }
    await this.client.set(key, raw, "EX", ttlSeconds);
  }

  async delete(key: string): Promise<void> {
    await this.client.del(key);
  }

  async close(): Promise<void> {
    await this.client.quit();
  }
}
