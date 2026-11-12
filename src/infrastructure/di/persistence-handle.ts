import { OutboxStore } from "../../application/ports/outbox";
import { QueryableRepository } from "../../domain/repositories/queryable-repository";
import { UserRecord } from "../../domain/entities/user";
import { UserUnitOfWork } from "../../application/ports/user-unit-of-work";

export interface Persistence {
  repository: QueryableRepository<UserRecord>;
  unitOfWork: UserUnitOfWork;
  outbox: OutboxStore;
  close(): Promise<void>;
}
