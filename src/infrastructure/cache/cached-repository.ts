import { Cache, CacheInvalidator } from "../../application/ports/cache";
import { Page, Query } from "../../domain/repositories/query";
import { QueryableRepository } from "../../domain/repositories/queryable-repository";

export class CachedRepository<TEntity extends { id: string }> implements QueryableRepository<TEntity>, CacheInvalidator {
  constructor(
    private readonly inner: QueryableRepository<TEntity>,
    private readonly cache: Cache,
    private readonly namespace: string,
    private readonly ttlSeconds = 60,
  ) {}

  async findById(id: string): Promise<TEntity | null> {
    const key = this.keyFor(id);
    const cached = await this.cache.get<TEntity>(key);
    if (cached) {
      return cached;
    }
    const found = await this.inner.findById(id);
    if (found) {
      await this.cache.set(key, found, this.ttlSeconds);
    }
    return found;
  }

  async save(entity: TEntity): Promise<TEntity> {
    const saved = await this.inner.save(entity);
    await this.cache.set(this.keyFor(saved.id), saved, this.ttlSeconds);
    return saved;
  }

  async remove(id: string): Promise<void> {
    await this.inner.remove(id);
    await this.invalidate(id);
  }

  invalidate(id: string): Promise<void> {
    return this.cache.delete(this.keyFor(id));
  }

  find(query: Query<TEntity>): Promise<Page<TEntity>> {
    return this.inner.find(query);
  }

  private keyFor(id: string): string {
    return `${this.namespace}:${id}`;
  }
}
