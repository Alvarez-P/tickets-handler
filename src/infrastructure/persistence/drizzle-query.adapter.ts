import { and, asc, count, desc, eq } from "drizzle-orm";
import { PgColumn as AnyColumn, PgTable as AnyTable } from "drizzle-orm/pg-core";
import { Page, Query, QueryAdapter } from "../../domain/repositories/query";
import { resolvePagination } from "../../domain/repositories/pagination";
import { DrizzleClient } from "./drizzle-client";

export type IdentifiedTable = AnyTable & { id: AnyColumn };

export const columnsOf = (table: IdentifiedTable): Record<string, AnyColumn> =>
  table as unknown as Record<string, AnyColumn>;

export class DrizzleQueryAdapter<TEntity> implements QueryAdapter<TEntity> {
  constructor(
    private readonly client: DrizzleClient,
    private readonly table: IdentifiedTable,
  ) {}

  async find(query: Query<TEntity>): Promise<Page<TEntity>> {
    const { page, pageSize, offset } = resolvePagination(query);
    const columns = columnsOf(this.table);
    const conditions = Object.entries(query.where ?? {}).map(([field, value]) => eq(columns[field], value));
    const where = conditions.length > 0 ? and(...conditions) : undefined;
    const direction = query.orderBy?.direction === "desc" ? desc : asc;
    const ordering = query.orderBy ? [direction(columns[query.orderBy.field])] : [];
    const rows = await this.client.select().from(this.table).where(where).orderBy(...ordering).limit(pageSize).offset(offset);
    const [{ total }] = await this.client.select({ total: count() }).from(this.table).where(where);
    return { items: rows as unknown as TEntity[], total, page, pageSize };
  }
}
