import { randomUUID } from "node:crypto";
import { registerUser, User } from "../../domain/entities/user";
import { Role } from "../../domain/value-objects/role";
import { PasswordHasher } from "../ports/password-hasher";
import { UserUnitOfWork } from "../ports/user-unit-of-work";
import { UseCase } from "../use-case";

export interface CreateUserInput {
  email: string;
  name: string;
  role?: Role;
  password?: string;
}

export class CreateUser implements UseCase<CreateUserInput, User> {
  constructor(
    private readonly unitOfWork: UserUnitOfWork,
    private readonly hasher: PasswordHasher,
  ) {}

  async execute({ password, ...profile }: CreateUserInput): Promise<User> {
    const hash = password === undefined ? undefined : await this.hasher.hash(password);
    return this.unitOfWork.run(async ({ users, credentials, outbox }) => {
      const user = await users.save(registerUser(randomUUID(), { ...profile, hasCredentials: hash !== undefined }));
      if (hash !== undefined) {
        await credentials.set(user.id, hash);
      }
      await outbox.enqueue("user.created", user);
      return user;
    });
  }
}
