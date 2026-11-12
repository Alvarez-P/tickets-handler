
import { UserTransaction, UserUnitOfWork } from "../../application/ports/user-unit-of-work";
import { DrizzleCredentialStore } from "./drizzle-credential-store";
import { DrizzleClient } from "./drizzle-client";
import { DrizzleOutbox } from "./drizzle-outbox";
import { DrizzleUserRepository } from "./drizzle-user.repository";

export class DrizzleUnitOfWork implements UserUnitOfWork {
  constructor(private readonly client: DrizzleClient) {}

  run<TResult>(work: (transaction: UserTransaction) => Promise<TResult>): Promise<TResult> {
    return this.client.transaction((transaction) => {
      const scoped = transaction as unknown as DrizzleClient;
      return work({
        users: new DrizzleUserRepository(scoped),
        credentials: new DrizzleCredentialStore(scoped),
        outbox: new DrizzleOutbox(scoped),
      });
    });
  }
}
