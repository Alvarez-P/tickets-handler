import { Inject } from "@nestjs/common";
import { CommandHandler, EventBus, ICommandHandler, IQueryHandler, QueryHandler } from "@nestjs/cqrs";
import { CREATE_USER, USERS } from "../../shared/di/tokens";
import { QueryableRepository } from "../../domain/repositories/queryable-repository";
import { Role } from "../../domain/value-objects/role";
import { UseCase } from "../use-case";
import { User } from "../../domain/entities/user";
import { Command, DomainEvent, Query } from "../../shared/cqrs/cqrs";
import { CreateUserInput } from "./create-user.use-case";

export class CreateUserCommand extends Command<User> {
  constructor(
    readonly email: string,
    readonly name: string,
    readonly role?: Role,
    readonly password?: string,
  ) {
    super();
  }
}

export class GetUserQuery extends Query<User | null> {
  constructor(readonly id: string) {
    super();
  }
}

export class UserCreatedEvent extends DomainEvent {
  constructor(readonly user: User) {
    super();
  }
}

@CommandHandler(CreateUserCommand)
export class CreateUserHandler implements ICommandHandler<CreateUserCommand, User> {
  constructor(
    @Inject(CREATE_USER) private readonly createUser: UseCase<CreateUserInput, User>,
    private readonly events: EventBus,
  ) {}

  async execute(command: CreateUserCommand): Promise<User> {
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
export class GetUserHandler implements IQueryHandler<GetUserQuery, User | null> {
  constructor(@Inject(USERS) private readonly users: QueryableRepository<User>) {}

  execute(query: GetUserQuery): Promise<User | null> {
    return this.users.findById(query.id);
  }
}

export const userCqrsHandlers = [CreateUserHandler, GetUserHandler];
