import { AgentRole, isAgentRole } from "../../../domain/entities/agent";
import { Specialty } from "../../../domain/entities/specialty";
import { InvalidAgentRole, SpecialistRequiresSpecialties, SpecialtyNotFound } from "../../../domain/errors/staff-errors";
import { SpecialtyRepository } from "../../../domain/repositories/specialty.repository";
import { Role } from "../../../shared/contracts/role";

export const requireAgentRole = (role: Role): AgentRole => {
  if (!isAgentRole(role)) {
    throw new InvalidAgentRole();
  }
  return role;
};

export const uniqueIds = (ids: string[]): string[] => [...new Set(ids)];

export const requireActiveSpecialties = async (specialties: SpecialtyRepository, ids: string[]): Promise<Specialty[]> => {
  const found = await specialties.findByIds(ids);
  if (found.length !== ids.length || found.some((specialty) => !specialty.active)) {
    throw new SpecialtyNotFound();
  }
  return found;
};

export const requireSpecialtyCoverage = (role: AgentRole, activeSpecialties: Specialty[]): void => {
  if (role === "specialist-agent" && activeSpecialties.length === 0) {
    throw new SpecialistRequiresSpecialties();
  }
};
