import { Inject } from "@nestjs/common";
import { CommandHandler, EventBus, ICommandHandler, IQueryHandler, QueryHandler } from "@nestjs/cqrs";
import { CREATE_USER, USERS } from "../../shared/di/tokens";
import { QueryableRepository } from "../../domain/repositories/queryable-repository";
import { Role } from "../../domain/value-objects/role";
import { UseCase } from "../use-case";
import { UserRecord } from "../../domain/entities/user";
import { Command, DomainEvent, Query } from "../../shared/cqrs/cqrs";
import { CreateUserInput } from "./create-user.use-case";

export class CreateUserCommand extends Command<UserRecord> {
  constructor(
    readonly email: string,
    readonly name: string,
    readonly role?: Role,
    readonly password?: string,
  ) {
    super();
  }
}

export class GetUserQuery extends Query<UserRecord | null> {
  constructor(readonly id: string) {
    super();
  }
}

export class UserCreatedEvent extends DomainEvent {
  constructor(readonly user: UserRecord) {
    super();
  }
}

@CommandHandler(CreateUserCommand)
export class CreateUserHandler implements ICommandHandler<CreateUserCommand, UserRecord> {
  constructor(
    @Inject(CREATE_USER) private readonly createUser: UseCase<CreateUserInput, UserRecord>,
    private readonly events: EventBus,
  ) {}

  async execute(command: CreateUserCommand): Promise<UserRecord> {
    const user = await this.createUser.execute({
      email: command.email,
      name: command.name,
      role: command.role,
      password: command.password,
    });
    this.events.publish(new UserCreatedEvent(user));
    return user;
  }
}

@QueryHandler(GetUserQuery)
export class GetUserHandler implements IQueryHandler<GetUserQuery, UserRecord | null> {
  constructor(@Inject(USERS) private readonly users: QueryableRepository<UserRecord>) {}

  execute(query: GetUserQuery): Promise<UserRecord | null> {
    return this.users.findById(query.id);
  }
}

export const userCqrsHandlers = [CreateUserHandler, GetUserHandler];
