import { Agent } from "../../domain/entities/agent";
import { Specialty } from "../../domain/entities/specialty";
import { AgentFilter, AgentRepository } from "../../domain/repositories/agent.repository";
import { SpecialtyRepository } from "../../domain/repositories/specialty.repository";
import { CreateAgent, CreateAgentInput } from "../../application/use-cases/staff/create-agent.use-case";
import { CreateSpecialty, CreateSpecialtyInput } from "../../application/use-cases/staff/create-specialty.use-case";
import { GetAgent } from "../../application/use-cases/staff/get-agent.use-case";
import { ListAgents } from "../../application/use-cases/staff/list-agents.use-case";
import { ListSpecialties, ListSpecialtiesInput } from "../../application/use-cases/staff/list-specialties.use-case";
import {
  SetSpecialtyActive,
  SetSpecialtyActiveInput,
} from "../../application/use-cases/staff/set-specialty-active.use-case";
import { UpdateAgent, UpdateAgentInput } from "../../application/use-cases/staff/update-agent.use-case";
import { CacheInvalidator } from "../../shared/contracts/cache";
import { Page } from "../../shared/contracts/query";
import { StaffUnitOfWork } from "../../shared/contracts/staff-unit-of-work";
import { UseCase } from "../../shared/contracts/use-case";

export interface StaffContainer {
  specialties: SpecialtyRepository;
  agents: AgentRepository;
  unitOfWork: StaffUnitOfWork;
  createSpecialty: UseCase<CreateSpecialtyInput, Specialty>;
  setSpecialtyActive: UseCase<SetSpecialtyActiveInput, Specialty>;
  listSpecialties: UseCase<ListSpecialtiesInput, Page<Specialty>>;
  createAgent: UseCase<CreateAgentInput, Agent>;
  updateAgent: UseCase<UpdateAgentInput, Agent>;
  listAgents: UseCase<AgentFilter, Page<Agent>>;
  getAgent: UseCase<string, Agent>;
}

export const buildStaffContainer = (
  specialties: SpecialtyRepository,
  agents: AgentRepository,
  unitOfWork: StaffUnitOfWork,
  userCache: CacheInvalidator,
): StaffContainer => ({
  specialties,
  agents,
  unitOfWork,
  createSpecialty: new CreateSpecialty(specialties),
  setSpecialtyActive: new SetSpecialtyActive(specialties),
  listSpecialties: new ListSpecialties(specialties),
  createAgent: new CreateAgent(unitOfWork),
  updateAgent: new UpdateAgent(unitOfWork, userCache),
  listAgents: new ListAgents(agents),
  getAgent: new GetAgent(agents),
});
