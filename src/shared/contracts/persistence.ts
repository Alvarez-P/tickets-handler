import { OutboxStore } from "./outbox";
import { QueryableRepository } from "./queryable-repository";
import { UserRecord } from "./user-record";
import { UserUnitOfWork } from "./unit-of-work";

export interface Persistence {
  repository: QueryableRepository<UserRecord>;
  unitOfWork: UserUnitOfWork;
  outbox: OutboxStore;
  close(): Promise<void>;
}
