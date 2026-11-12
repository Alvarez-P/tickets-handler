import { CommandBus, CqrsModule, EventBus, QueryBus } from "@nestjs/cqrs";
import { Test } from "@nestjs/testing";
import { CREATE_USER, USERS } from "../../src/infrastructure/di/tokens";
import { ScryptPasswordHasher } from "../../src/infrastructure/auth/scrypt-password-hasher";
import { CreateUser } from "../../src/application/use-cases/create-user.use-case";
import {
  CreateUserCommand,
  GetUserQuery,
  UserCreatedEvent,
  userCqrsHandlers,
} from "../../src/application/use-cases/user.cqrs";
import { UserRecord } from "../../src/domain/entities/user";
import { InMemoryUnitOfWork } from "../../src/shared/testing/in-memory-unit-of-work";
import { InMemoryRepository } from "../../src/shared/testing/in-memory-repository";

const build = async () => {
  const users = new InMemoryRepository<UserRecord>();
  const moduleRef = await Test.createTestingModule({
    imports: [CqrsModule.forRoot()],
    providers: [
      { provide: USERS, useValue: users },
      { provide: CREATE_USER, useValue: new CreateUser(new InMemoryUnitOfWork(users), new ScryptPasswordHasher()) },
      ...userCqrsHandlers,
    ],
  }).compile();
  await moduleRef.init();
  return {
    users,
    commands: moduleRef.get(CommandBus),
    queries: moduleRef.get(QueryBus),
    events: moduleRef.get(EventBus),
  };
};

describe("user CQRS", () => {
  it("executes the command through the Nest bus", async () => {
    const { commands, users } = await build();

    const created: UserRecord = await commands.execute(new CreateUserCommand("ada@example.com", "Ada"));

    expect(await users.findById(created.id)).toEqual(created);
  });

  it("answers queries through the query bus", async () => {
    const { commands, queries } = await build();
    const created: UserRecord = await commands.execute(new CreateUserCommand("ada@example.com", "Ada"));

    expect(await queries.execute(new GetUserQuery(created.id))).toEqual(created);
    expect(await queries.execute(new GetUserQuery("missing"))).toBeNull();
  });

  it("publishes UserCreatedEvent after the command", async () => {
    const { commands, events } = await build();
    const received: string[] = [];
    events.subject$.subscribe((event) => {
      if (event instanceof UserCreatedEvent) {
        received.push(event.user.email);
      }
    });

    await commands.execute(new CreateUserCommand("ada@example.com", "Ada"));

    expect(received).toEqual(["ada@example.com"]);
  });
});
