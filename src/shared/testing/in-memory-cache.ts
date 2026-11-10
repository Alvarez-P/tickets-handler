import { Cache } from "../contracts/cache";

export class InMemoryCache implements Cache {
  private readonly entries = new Map<string, unknown>();

  async get<TValue>(key: string): Promise<TValue | null> {
    return (this.entries.get(key) as TValue | undefined) ?? null;
  }

  async set<TValue>(key: string, value: TValue): Promise<void> {
    this.entries.set(key, value);
  }

  async delete(key: string): Promise<void> {
    this.entries.delete(key);
  }

  async close(): Promise<void> {
    this.entries.clear();
  }
}
