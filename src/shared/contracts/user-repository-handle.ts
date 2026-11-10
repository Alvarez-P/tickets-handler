import { QueryableRepository } from "./queryable-repository";
import { UserRecord } from "./user-record";

export interface UserRepositoryHandle {
  repository: QueryableRepository<UserRecord>;
  close(): Promise<void>;
}
