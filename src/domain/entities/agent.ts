import type { Role } from "../value-objects/role";
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
