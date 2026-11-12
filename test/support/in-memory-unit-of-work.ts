import { CredentialStore } from "../../src/application/ports/credential-store";
import { QueryableRepository } from "../../src/domain/repositories/queryable-repository";
import { User } from "../../src/domain/entities/user";
import { UserTransaction, UserUnitOfWork } from "../../src/application/ports/user-unit-of-work";
import { InMemoryCredentialStore } from "./in-memory-auth-stores";

export interface QueuedMessage {
  topic: string;
  payload: unknown;
}

export class InMemoryUnitOfWork implements UserUnitOfWork {
  readonly messages: QueuedMessage[] = [];

  constructor(
    private readonly users: QueryableRepository<User>,
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
