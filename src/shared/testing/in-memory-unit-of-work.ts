import { CredentialStore } from "../contracts/credential-store";
import { QueryableRepository } from "../contracts/queryable-repository";
import { UserRecord } from "../contracts/user-record";
import { UserTransaction, UserUnitOfWork } from "../contracts/unit-of-work";
import { InMemoryCredentialStore } from "./in-memory-auth-stores";

export interface QueuedMessage {
  topic: string;
  payload: unknown;
}

export class InMemoryUnitOfWork implements UserUnitOfWork {
  readonly messages: QueuedMessage[] = [];

  constructor(
    private readonly users: QueryableRepository<UserRecord>,
    private readonly credentials: CredentialStore = new InMemoryCredentialStore(users),
  ) {}

  run<TResult>(work: (transaction: UserTransaction) => Promise<TResult>): Promise<TResult> {
    return work({
      users: this.users,
      credentials: this.credentials,
      outbox: {
        enqueue: async (topic, payload) => {
          this.messages.push({ topic, payload });
        },
      },
    });
  }
}
