import type { Role } from "../../shared/contracts/role";
import type { UserStatus } from "../../shared/contracts/user-record";

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
