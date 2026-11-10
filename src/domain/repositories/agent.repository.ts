import type { Page } from "../../shared/contracts/query";
import type { QueryableRepository } from "../../shared/contracts/queryable-repository";
import type { UserRecord, UserStatus } from "../../shared/contracts/user-record";
import type { Agent, AgentRole } from "../entities/agent";
import type { AgentRef } from "../entities/ticket";

export interface AgentFilter {
  role?: AgentRole;
  status?: UserStatus;
  specialtyId?: string;
  page?: number;
  pageSize?: number;
}

export interface AgentRepository extends QueryableRepository<UserRecord> {
  findByEmail(email: string): Promise<UserRecord | null>;
  setSpecialties(agentId: string, specialtyIds: string[]): Promise<void>;
  findWithSpecialties(id: string): Promise<Agent | null>;
  findAgents(filter: AgentFilter): Promise<Page<Agent>>;
  findLeastLoaded(specialtyId: string): Promise<AgentRef | null>;
  adjustOpenTickets(agentId: string, delta: number): Promise<void>;
}
