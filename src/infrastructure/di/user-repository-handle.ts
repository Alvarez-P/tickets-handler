import { QueryableRepository } from "../../domain/repositories/queryable-repository";
import { User } from "../../domain/entities/user";

export interface UserRepositoryHandle {
  repository: QueryableRepository<User>;
  close(): Promise<void>;
}
