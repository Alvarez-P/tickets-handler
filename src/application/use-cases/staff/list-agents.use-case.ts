import { Agent } from "../../../domain/entities/agent";
import { AgentFilter, AgentRepository } from "../../../domain/repositories/agent.repository";
import { Page } from "../../../domain/repositories/query";
import { UseCase } from "../../use-case";

export class ListAgents implements UseCase<AgentFilter, Page<Agent>> {
  constructor(private readonly agents: AgentRepository) {}

  execute(filter: AgentFilter): Promise<Page<Agent>> {
    return this.agents.findAgents(filter);
  }
}
