import { randomUUID } from "node:crypto";
import { Agent } from "../../../domain/entities/agent";
import { EmailAlreadyRegistered } from "../../../domain/errors/staff-errors";
import { AgentCreated, STAFF_EVENTS_TOPIC } from "../../../domain/events/staff-events";
import { Role } from "../../../domain/value-objects/role";
import { StaffUnitOfWork } from "../../ports/staff-unit-of-work";
import { UseCase } from "../../use-case";
import { correlationContext } from "../../../shared/observability/correlation-context";
import { requireActiveSpecialties, requireAgentRole, requireSpecialtyCoverage, uniqueIds } from "./staff-rules";

export interface CreateAgentInput {
  email: string;
  name: string;
  role: Role;
  specialtyIds: string[];
}

export class CreateAgent implements UseCase<CreateAgentInput, Agent> {
  constructor(private readonly unitOfWork: StaffUnitOfWork) {}

  async execute({ email, name, role, specialtyIds }: CreateAgentInput): Promise<Agent> {
    const agentRole = requireAgentRole(role);
    const ids = uniqueIds(specialtyIds);
    return this.unitOfWork.run(async ({ agents, specialties, outbox }) => {
      requireSpecialtyCoverage(agentRole, await requireActiveSpecialties(specialties, ids));
      if ((await agents.findByEmail(email)) !== null) {
        throw new EmailAlreadyRegistered();
      }
      const user = await agents.save({ id: randomUUID(), email, name, role: agentRole, status: "invited" });
      await agents.setSpecialties(user.id, ids);
      const eventId = randomUUID();
      const event: AgentCreated = {
        type: "agent.created",
        eventId,
        agentId: user.id,
        role: agentRole,
        specialtyIds: ids,
        correlationId: correlationContext.get() ?? eventId,
      };
      await outbox.enqueue(STAFF_EVENTS_TOPIC, event);
      return { id: user.id, email, name, role: agentRole, status: user.status, specialtyIds: ids };
    });
  }
}
