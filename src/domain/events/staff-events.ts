import type { AgentRole } from "../entities/agent";

export const STAFF_EVENTS_TOPIC = "staff.events";

export interface AgentCreated {
  type: "agent.created";
  eventId: string;
  agentId: string;
  role: AgentRole;
  specialtyIds: string[];
  correlationId: string;
}
