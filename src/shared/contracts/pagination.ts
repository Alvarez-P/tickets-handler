import { Query } from "./query";

export const DEFAULT_PAGE_SIZE = 20;

export interface ResolvedPagination {
  page: number;
  pageSize: number;
  offset: number;
}

export const resolvePagination = <TEntity>(query: Query<TEntity>): ResolvedPagination => {
  const page = Math.max(query.page ?? 1, 1);
  const pageSize = Math.max(query.pageSize ?? DEFAULT_PAGE_SIZE, 1);
  return { page, pageSize, offset: (page - 1) * pageSize };
};
