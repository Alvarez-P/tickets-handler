import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { ApiZodBody, ApiZodQuery } from "./api-docs";
import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from "@nestjs/common";
import { CommandBus, QueryBus } from "@nestjs/cqrs";
import {
  CreateSpecialtyCommand,
  ListSpecialtiesQuery,
  SetSpecialtyActiveCommand,
} from "../cqrs/staff.cqrs";
import { Specialty } from "../../domain/entities/specialty";
import { Page } from "../../domain/repositories/query";
import { Roles } from "../auth/roles.decorator";
import { RolesGuard } from "../auth/roles.guard";
import { JwtAuthGuard } from "./jwt-auth.guard";
import { parseInput } from "./parse-input";
import { createSpecialtySchema, listSpecialtiesSchema, setSpecialtyActiveSchema } from "./staff.schemas";

@ApiTags("admin")
@ApiBearerAuth()
@Controller("admin/specialties")
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles("admin")
export class AdminSpecialtiesController {
  constructor(
    private readonly commands: CommandBus,
    private readonly queries: QueryBus,
  ) {}

  @Post()
  @ApiZodBody(createSpecialtySchema)
  create(@Body() body: unknown): Promise<Specialty> {
    return this.commands.execute(new CreateSpecialtyCommand(parseInput(createSpecialtySchema, body)));
  }

  @Get()
  @ApiZodQuery(listSpecialtiesSchema)
  list(@Query() query: unknown): Promise<Page<Specialty>> {
    return this.queries.execute(new ListSpecialtiesQuery(parseInput(listSpecialtiesSchema, query)));
  }

  @Patch(":id/active")
  @ApiZodBody(setSpecialtyActiveSchema)
  setActive(@Param("id") id: string, @Body() body: unknown): Promise<Specialty> {
    const { active } = parseInput(setSpecialtyActiveSchema, body);
    return this.commands.execute(new SetSpecialtyActiveCommand({ id, active }));
  }
}
