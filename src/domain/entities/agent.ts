import { InvalidAgentRole, InvalidAgentStatusTransition, SpecialistRequiresSpecialties } from "../errors/staff-errors";
import type { Role } from "../value-objects/role";
import type { Specialty } from "./specialty";
import type { UserStatus } from "./user";

export const AGENT_ROLES = ["support-agent", "specialist-agent"] as const satisfies readonly Role[];

export type AgentRole = (typeof AGENT_ROLES)[number];

export const isAgentRole = (role: Role): role is AgentRole => AGENT_ROLES.some((agentRole) => agentRole === role);

export interface Agent {
  id: string;
  email: string;
  name: string;
  role: AgentRole;
  status: UserStatus;
  specialtyIds: string[];
}

export const toAgentRole = (role: Role): AgentRole => {
  if (!isAgentRole(role)) {
    throw new InvalidAgentRole();
  }
  return role;
};

export const uniqueSpecialtyIds = (ids: readonly string[]): string[] => [...new Set(ids)];

export const assertSpecialtyCoverage = (role: AgentRole, activeSpecialties: readonly Specialty[]): void => {
  if (role === "specialist-agent" && activeSpecialties.length === 0) {
    throw new SpecialistRequiresSpecialties();
  }
};

export const assertStatusChangeAllowed = (current: UserStatus): void => {
  if (current === "invited") {
    throw new InvalidAgentStatusTransition();
  }
};
