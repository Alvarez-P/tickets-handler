import { Inject } from "@nestjs/common";
import { CommandHandler, ICommandHandler, IQueryHandler, QueryHandler } from "@nestjs/cqrs";
import { Agent } from "../../../domain/entities/agent";
import { Specialty } from "../../../domain/entities/specialty";
import { AgentFilter } from "../../../domain/repositories/agent.repository";
import { Page } from "../../../domain/repositories/query";
import { UseCase } from "../../use-case";
import { Command, Query } from "../../../shared/cqrs/cqrs";
import {
  CREATE_AGENT,
  CREATE_SPECIALTY,
  GET_AGENT,
  LIST_AGENTS,
  LIST_SPECIALTIES,
  SET_SPECIALTY_ACTIVE,
  UPDATE_AGENT,
} from "../../../shared/di/tokens";
import { CreateAgentInput } from "./create-agent.use-case";
import { CreateSpecialtyInput } from "./create-specialty.use-case";
import { ListSpecialtiesInput } from "./list-specialties.use-case";
import { SetSpecialtyActiveInput } from "./set-specialty-active.use-case";
import { UpdateAgentInput } from "./update-agent.use-case";

export class CreateSpecialtyCommand extends Command<Specialty> {
  constructor(readonly input: CreateSpecialtyInput) {
    super();
  }
}

export class SetSpecialtyActiveCommand extends Command<Specialty> {
  constructor(readonly input: SetSpecialtyActiveInput) {
    super();
  }
}

export class CreateAgentCommand extends Command<Agent> {
  constructor(readonly input: CreateAgentInput) {
    super();
  }
}

export class UpdateAgentCommand extends Command<Agent> {
  constructor(readonly input: UpdateAgentInput) {
    super();
  }
}

export class ListAgentsQuery extends Query<Page<Agent>> {
  constructor(readonly filter: AgentFilter) {
    super();
  }
}

export class GetAgentQuery extends Query<Agent> {
  constructor(readonly id: string) {
    super();
  }
}

export class ListSpecialtiesQuery extends Query<Page<Specialty>> {
  constructor(readonly input: ListSpecialtiesInput) {
    super();
  }
}

@CommandHandler(CreateSpecialtyCommand)
export class CreateSpecialtyHandler implements ICommandHandler<CreateSpecialtyCommand, Specialty> {
  constructor(@Inject(CREATE_SPECIALTY) private readonly createSpecialty: UseCase<CreateSpecialtyInput, Specialty>) {}

  execute(command: CreateSpecialtyCommand): Promise<Specialty> {
    return this.createSpecialty.execute(command.input);
  }
}

@CommandHandler(SetSpecialtyActiveCommand)
export class SetSpecialtyActiveHandler implements ICommandHandler<SetSpecialtyActiveCommand, Specialty> {
  constructor(@Inject(SET_SPECIALTY_ACTIVE) private readonly setSpecialtyActive: UseCase<SetSpecialtyActiveInput, Specialty>) {}

  execute(command: SetSpecialtyActiveCommand): Promise<Specialty> {
    return this.setSpecialtyActive.execute(command.input);
  }
}

@CommandHandler(CreateAgentCommand)
export class CreateAgentHandler implements ICommandHandler<CreateAgentCommand, Agent> {
  constructor(@Inject(CREATE_AGENT) private readonly createAgent: UseCase<CreateAgentInput, Agent>) {}

  execute(command: CreateAgentCommand): Promise<Agent> {
    return this.createAgent.execute(command.input);
  }
}

@CommandHandler(UpdateAgentCommand)
export class UpdateAgentHandler implements ICommandHandler<UpdateAgentCommand, Agent> {
  constructor(@Inject(UPDATE_AGENT) private readonly updateAgent: UseCase<UpdateAgentInput, Agent>) {}

  execute(command: UpdateAgentCommand): Promise<Agent> {
    return this.updateAgent.execute(command.input);
  }
}

@QueryHandler(ListAgentsQuery)
export class ListAgentsHandler implements IQueryHandler<ListAgentsQuery, Page<Agent>> {
  constructor(@Inject(LIST_AGENTS) private readonly listAgents: UseCase<AgentFilter, Page<Agent>>) {}

  execute(query: ListAgentsQuery): Promise<Page<Agent>> {
    return this.listAgents.execute(query.filter);
  }
}

@QueryHandler(GetAgentQuery)
export class GetAgentHandler implements IQueryHandler<GetAgentQuery, Agent> {
  constructor(@Inject(GET_AGENT) private readonly getAgent: UseCase<string, Agent>) {}

  execute(query: GetAgentQuery): Promise<Agent> {
    return this.getAgent.execute(query.id);
  }
}

@QueryHandler(ListSpecialtiesQuery)
export class ListSpecialtiesHandler implements IQueryHandler<ListSpecialtiesQuery, Page<Specialty>> {
  constructor(@Inject(LIST_SPECIALTIES) private readonly listSpecialties: UseCase<ListSpecialtiesInput, Page<Specialty>>) {}

  execute(query: ListSpecialtiesQuery): Promise<Page<Specialty>> {
    return this.listSpecialties.execute(query.input);
  }
}

export const staffCqrsHandlers = [
  CreateSpecialtyHandler,
  SetSpecialtyActiveHandler,
  CreateAgentHandler,
  UpdateAgentHandler,
  ListAgentsHandler,
  GetAgentHandler,
  ListSpecialtiesHandler,
];
