import { QueryableRepository } from "../../domain/repositories/queryable-repository";
import { UserRecord } from "../../domain/entities/user";

export interface UserRepositoryHandle {
  repository: QueryableRepository<UserRecord>;
  close(): Promise<void>;
}
