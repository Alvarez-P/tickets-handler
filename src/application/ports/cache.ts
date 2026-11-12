export interface Cache {
  get<TValue>(key: string): Promise<TValue | null>;
  set<TValue>(key: string, value: TValue, ttlSeconds?: number): Promise<void>;
  delete(key: string): Promise<void>;
  close(): Promise<void>;
}

export interface CacheInvalidator {
  invalidate(id: string): Promise<void>;
}
