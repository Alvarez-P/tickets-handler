import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { ApiZodBody } from "./api-docs";
import { BadRequestException, Body, Controller, Get, NotFoundException, Param, Post, UseGuards } from "@nestjs/common";
import { CommandBus, QueryBus } from "@nestjs/cqrs";
import { CreateUserCommand, GetUserQuery } from "../../application/use-cases/user.cqrs";
import { Roles } from "../auth/roles.decorator";
import { RolesGuard } from "../auth/roles.guard";
import { User } from "../../domain/entities/user";
import { createUserSchema } from "./create-user.schema";
import { JwtAuthGuard } from "./jwt-auth.guard";

@ApiTags("users")
@ApiBearerAuth()
@Controller("users")
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles("admin")
export class UsersController {
  constructor(
    private readonly commands: CommandBus,
    private readonly queries: QueryBus,
  ) {}

  @Post()
  @ApiZodBody(createUserSchema)
  async create(@Body() body: unknown): Promise<User> {
    const parsed = createUserSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.issues);
    }
    return this.commands.execute(new CreateUserCommand(parsed.data.email, parsed.data.name, parsed.data.role, parsed.data.password));
  }

  @Get(":id")
  async get(@Param("id") id: string): Promise<User> {
    const user = await this.queries.execute(new GetUserQuery(id));
    if (!user) {
      throw new NotFoundException();
    }
    return user;
  }
}
