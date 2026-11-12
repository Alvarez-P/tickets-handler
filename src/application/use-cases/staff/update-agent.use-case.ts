import { Agent } from "../../../domain/entities/agent";
import { AgentNotFound, InvalidAgentStatusTransition } from "../../../domain/errors/staff-errors";
import { CacheInvalidator } from "../../ports/cache";
import { Role } from "../../../domain/value-objects/role";
import { StaffUnitOfWork } from "../../ports/staff-unit-of-work";
import { UseCase } from "../../use-case";
import { requireActiveSpecialties, requireAgentRole, requireSpecialtyCoverage, uniqueIds } from "./staff-rules";

export interface UpdateAgentInput {
  id: string;
  name?: string;
  role?: Role;
  status?: "active" | "disabled";
  specialtyIds?: string[];
}

export class UpdateAgent implements UseCase<UpdateAgentInput, Agent> {
  constructor(
    private readonly unitOfWork: StaffUnitOfWork,
    private readonly userCache: CacheInvalidator,
  ) {}

  async execute(input: UpdateAgentInput): Promise<Agent> {
    const updated = await this.unitOfWork.run(async ({ agents, specialties }) => {
      const current = await agents.findWithSpecialties(input.id);
      if (current === null) {
        throw new AgentNotFound();
      }
      const role = input.role === undefined ? current.role : requireAgentRole(input.role);
      if (input.status !== undefined && current.status === "invited") {
        throw new InvalidAgentStatusTransition();
      }
      const replacement = input.specialtyIds === undefined ? undefined : uniqueIds(input.specialtyIds);
      const activeSpecialties =
        replacement === undefined
          ? (await specialties.findByIds(current.specialtyIds)).filter((specialty) => specialty.active)
          : await requireActiveSpecialties(specialties, replacement);
      requireSpecialtyCoverage(role, activeSpecialties);
      await agents.save({
        id: current.id,
        email: current.email,
        name: input.name ?? current.name,
        role,
        status: input.status ?? current.status,
      });
      if (replacement !== undefined) {
        await agents.setSpecialties(current.id, replacement);
      }
      const updated = await agents.findWithSpecialties(current.id);
      if (updated === null) {
        throw new AgentNotFound();
      }
      return updated;
    });
    await this.userCache.invalidate(input.id);
    return updated;
  }
}
