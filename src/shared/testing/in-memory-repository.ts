import { Page, Query } from "../contracts/query";
import { resolvePagination } from "../contracts/pagination";
import { QueryableRepository } from "../contracts/queryable-repository";

export class InMemoryRepository<TEntity extends { id: string }> implements QueryableRepository<TEntity> {
  private readonly rows = new Map<string, TEntity>();

  async findById(id: string): Promise<TEntity | null> {
    return this.rows.get(id) ?? null;
  }

  async save(entity: TEntity): Promise<TEntity> {
    this.rows.set(entity.id, entity);
    return entity;
  }

  async remove(id: string): Promise<void> {
    this.rows.delete(id);
  }

  async find(query: Query<TEntity>): Promise<Page<TEntity>> {
    const { page, pageSize, offset } = resolvePagination(query);
    const filters = Object.entries(query.where ?? {});
    const matching = [...this.rows.values()].filter((row) =>
      filters.every(([field, value]) => row[field as keyof TEntity] === value),
    );
    return { items: matching.slice(offset, offset + pageSize), total: matching.length, page, pageSize };
  }
}
