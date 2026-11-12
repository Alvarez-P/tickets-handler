import { eq } from "drizzle-orm";
import { Page, Query, QueryAdapter } from "../../../domain/repositories/query";
import { QueryableRepository } from "../../../domain/repositories/queryable-repository";
import { DrizzleClient } from "./drizzle-client";
import { DrizzleQueryAdapter, IdentifiedTable } from "./drizzle-query.adapter";

export abstract class DrizzleBaseRepository<TEntity extends { id: string }> implements QueryableRepository<TEntity> {
  protected constructor(
    private readonly client: DrizzleClient,
    private readonly table: IdentifiedTable,
    private readonly queries: QueryAdapter<TEntity> = new DrizzleQueryAdapter<TEntity>(client, table),
  ) {}

  async findById(id: string): Promise<TEntity | null> {
    const [row] = await this.client.select().from(this.table).where(eq(this.table.id, id));
    return (row as unknown as TEntity | undefined) ?? null;
  }

  async save(entity: TEntity): Promise<TEntity> {
    const [row] = await this.client
      .insert(this.table)
      .values(entity as never)
      .onConflictDoUpdate({ target: this.table.id, set: entity as never })
      .returning();
    return row as unknown as TEntity;
  }

  async remove(id: string): Promise<void> {
    await this.client.delete(this.table).where(eq(this.table.id, id));
  }

  find(query: Query<TEntity>): Promise<Page<TEntity>> {
    return this.queries.find(query);
  }
}
