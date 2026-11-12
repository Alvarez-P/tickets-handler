export type SortDirection = "asc" | "desc";

export interface Query<TEntity> {
  where?: Partial<TEntity>;
  orderBy?: { field: keyof TEntity & string; direction: SortDirection };
  page?: number;
  pageSize?: number;
}

export interface Page<TEntity> {
  items: TEntity[];
  total: number;
  page: number;
  pageSize: number;
}

export interface QueryAdapter<TEntity> {
  find(query: Query<TEntity>): Promise<Page<TEntity>>;
}
