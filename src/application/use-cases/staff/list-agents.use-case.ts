import { Agent } from "../../../domain/entities/agent";
import { AgentFilter, AgentRepository } from "../../../domain/repositories/agent.repository";
import { Page } from "../../../shared/contracts/query";
import { UseCase } from "../../../shared/contracts/use-case";

export class ListAgents implements UseCase<AgentFilter, Page<Agent>> {
  constructor(private readonly agents: AgentRepository) {}

  execute(filter: AgentFilter): Promise<Page<Agent>> {
    return this.agents.findAgents(filter);
  }
}
