import { TicketTransaction, TicketUnitOfWork } from "../../shared/contracts/ticket-unit-of-work";
import { DrizzleAgentRepository } from "./drizzle-agent.repository";
import { DrizzleClient } from "./drizzle-client";
import { DrizzleOutbox } from "./drizzle-outbox";
import { DrizzleSpecialtyRepository } from "./drizzle-specialty.repository";
import { DrizzleTicketRepository } from "./drizzle-ticket.repository";

export class DrizzleTicketUnitOfWork implements TicketUnitOfWork {
  constructor(private readonly client: DrizzleClient) {}

  run<TResult>(work: (transaction: TicketTransaction) => Promise<TResult>): Promise<TResult> {
    return this.client.transaction((transaction) => {
      const scoped = transaction as unknown as DrizzleClient;
      return work({
        tickets: new DrizzleTicketRepository(scoped),
        agents: new DrizzleAgentRepository(scoped),
        specialties: new DrizzleSpecialtyRepository(scoped),
        outbox: new DrizzleOutbox(scoped),
      });
    });
  }
}
