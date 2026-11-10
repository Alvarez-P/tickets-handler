import { CredentialStore } from "./credential-store";
import { OutboxWriter } from "./outbox";
import { Repository } from "./repository";
import { UserRecord } from "./user-record";

export interface UserTransaction {
  users: Repository<UserRecord>;
  credentials: CredentialStore;
  outbox: OutboxWriter;
}

export interface UserUnitOfWork {
  run<TResult>(work: (transaction: UserTransaction) => Promise<TResult>): Promise<TResult>;
}
