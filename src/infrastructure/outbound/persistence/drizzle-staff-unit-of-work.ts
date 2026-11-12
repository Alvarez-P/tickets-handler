import { StaffTransaction, StaffUnitOfWork } from "../../../application/ports/staff-unit-of-work";
import { DrizzleAgentRepository } from "./drizzle-agent.repository";
import { DrizzleClient } from "./drizzle-client";
import { DrizzleOutbox } from "./drizzle-outbox";
import { DrizzleSpecialtyRepository } from "./drizzle-specialty.repository";

export class DrizzleStaffUnitOfWork implements StaffUnitOfWork {
  constructor(private readonly client: DrizzleClient) {}

  run<TResult>(work: (transaction: StaffTransaction) => Promise<TResult>): Promise<TResult> {
    return this.client.transaction((transaction) => {
      const scoped = transaction as unknown as DrizzleClient;
      return work({
        agents: new DrizzleAgentRepository(scoped),
        specialties: new DrizzleSpecialtyRepository(scoped),
        outbox: new DrizzleOutbox(scoped),
      });
    });
  }
}
