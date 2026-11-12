import type { AgentRepository } from "../../domain/repositories/agent.repository";
import type { SpecialtyRepository } from "../../domain/repositories/specialty.repository";
import type { TicketRepository } from "../../domain/repositories/ticket.repository";
import type { OutboxWriter } from "./outbox";

export interface TicketTransaction {
  tickets: TicketRepository;
  agents: AgentRepository;
  specialties: SpecialtyRepository;
  outbox: OutboxWriter;
}

export interface TicketUnitOfWork {
  run<TResult>(work: (transaction: TicketTransaction) => Promise<TResult>): Promise<TResult>;
}
