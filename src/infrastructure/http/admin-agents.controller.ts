import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { ApiZodBody, ApiZodQuery } from "./api-docs";
import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from "@nestjs/common";
import { CommandBus, QueryBus } from "@nestjs/cqrs";
import {
  CreateAgentCommand,
  GetAgentQuery,
  ListAgentsQuery,
  UpdateAgentCommand,
} from "../cqrs/staff.cqrs";
import { Agent } from "../../domain/entities/agent";
import { Page } from "../../domain/repositories/query";
import { Roles } from "../auth/roles.decorator";
import { RolesGuard } from "../auth/roles.guard";
import { JwtAuthGuard } from "./jwt-auth.guard";
import { parseInput } from "./parse-input";
import { createAgentSchema, listAgentsSchema, updateAgentSchema } from "./staff.schemas";

@ApiTags("admin")
@ApiBearerAuth()
@Controller("admin/agents")
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles("admin")
export class AdminAgentsController {
  constructor(
    private readonly commands: CommandBus,
    private readonly queries: QueryBus,
  ) {}

  @Post()
  @ApiZodBody(createAgentSchema)
  create(@Body() body: unknown): Promise<Agent> {
    return this.commands.execute(new CreateAgentCommand(parseInput(createAgentSchema, body)));
  }

  @Get()
  @ApiZodQuery(listAgentsSchema)
  list(@Query() query: unknown): Promise<Page<Agent>> {
    return this.queries.execute(new ListAgentsQuery(parseInput(listAgentsSchema, query)));
  }

  @Get(":id")
  get(@Param("id") id: string): Promise<Agent> {
    return this.queries.execute(new GetAgentQuery(id));
  }

  @Patch(":id")
  @ApiZodBody(updateAgentSchema)
  update(@Param("id") id: string, @Body() body: unknown): Promise<Agent> {
    return this.commands.execute(new UpdateAgentCommand({ id, ...parseInput(updateAgentSchema, body) }));
  }
}
