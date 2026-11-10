import type { TicketType } from "../value-objects/ticket-type";
import { DomainError } from "./domain-error";

export class SpecialtyCodeTaken extends DomainError {
  readonly code = "specialty_code_taken";

  constructor(specialtyCode: string) {
    super(`Specialty code ${specialtyCode} is already in use`);
  }
}

export class ActiveSpecialtyExistsForType extends DomainError {
  readonly code = "active_specialty_exists_for_type";

  constructor(ticketType: TicketType) {
    super(`An active specialty already exists for ticket type ${ticketType}`);
  }
}

export class SpecialtyNotFound extends DomainError {
  readonly code = "specialty_not_found";

  constructor() {
    super("Specialty not found or inactive");
  }
}

export class AgentNotFound extends DomainError {
  readonly code = "agent_not_found";

  constructor() {
    super("Agent not found");
  }
}

export class EmailAlreadyRegistered extends DomainError {
  readonly code = "email_already_registered";

  constructor() {
    super("Email is already registered");
  }
}

export class InvalidAgentRole extends DomainError {
  readonly code = "invalid_agent_role";

  constructor() {
    super("Agents must be support-agent or specialist-agent");
  }
}

export class SpecialistRequiresSpecialties extends DomainError {
  readonly code = "specialist_requires_specialties";

  constructor() {
    super("A specialist-agent needs at least one active specialty");
  }
}

export class InvalidAgentStatusTransition extends DomainError {
  readonly code = "invalid_agent_status_transition";

  constructor() {
    super("Invited agents cannot change status before setting credentials");
  }
}
