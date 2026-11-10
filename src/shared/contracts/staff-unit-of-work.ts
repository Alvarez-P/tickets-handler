import type { AgentRepository } from "../../domain/repositories/agent.repository";
import type { SpecialtyRepository } from "../../domain/repositories/specialty.repository";
import type { OutboxWriter } from "./outbox";

export interface StaffTransaction {
  agents: AgentRepository;
  specialties: SpecialtyRepository;
  outbox: OutboxWriter;
}

export interface StaffUnitOfWork {
  run<TResult>(work: (transaction: StaffTransaction) => Promise<TResult>): Promise<TResult>;
}
