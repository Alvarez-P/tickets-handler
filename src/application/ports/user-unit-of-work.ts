import { CredentialStore } from "./credential-store";
import { OutboxWriter } from "./outbox";
import { Repository } from "../../domain/repositories/repository";
import { UserRecord } from "../../domain/entities/user";

export interface UserTransaction {
  users: Repository<UserRecord>;
  credentials: CredentialStore;
  outbox: OutboxWriter;
}

export interface UserUnitOfWork {
  run<TResult>(work: (transaction: UserTransaction) => Promise<TResult>): Promise<TResult>;
}
