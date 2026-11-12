import { QueryAdapter } from "./query";
import { Repository } from "./repository";

export interface QueryableRepository<TEntity> extends Repository<TEntity>, QueryAdapter<TEntity> {}
