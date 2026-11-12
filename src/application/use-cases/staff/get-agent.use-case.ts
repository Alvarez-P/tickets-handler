import { Agent } from "../../../domain/entities/agent";
import { AgentNotFound } from "../../../domain/errors/staff-errors";
import { AgentRepository } from "../../../domain/repositories/agent.repository";
import { UseCase } from "../../use-case";

export class GetAgent implements UseCase<string, Agent> {
  constructor(private readonly agents: AgentRepository) {}

  async execute(id: string): Promise<Agent> {
    const agent = await this.agents.findWithSpecialties(id);
    if (agent === null) {
      throw new AgentNotFound();
    }
    return agent;
  }
}
