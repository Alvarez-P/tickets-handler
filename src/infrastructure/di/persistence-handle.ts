import { OutboxStore } from "../../application/ports/outbox";
import { QueryableRepository } from "../../domain/repositories/queryable-repository";
import { User } from "../../domain/entities/user";
import { UserUnitOfWork } from "../../application/ports/user-unit-of-work";

export interface Persistence {
  repository: QueryableRepository<User>;
  unitOfWork: UserUnitOfWork;
  outbox: OutboxStore;
  close(): Promise<void>;
}
