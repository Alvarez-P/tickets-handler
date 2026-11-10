import { randomUUID } from "node:crypto";
import { PasswordHasher } from "../../shared/contracts/password-hasher";
import { Role } from "../../shared/contracts/role";
import { UserUnitOfWork } from "../../shared/contracts/unit-of-work";
import { UseCase } from "../../shared/contracts/use-case";
import { UserRecord, UserStatus } from "../../shared/contracts/user-record";

export interface CreateUserInput {
  email: string;
  name: string;
  role?: Role;
  password?: string;
}

const DEFAULT_ROLE: Role = "support-agent";

export class CreateUser implements UseCase<CreateUserInput, UserRecord> {
  constructor(
    private readonly unitOfWork: UserUnitOfWork,
    private readonly hasher: PasswordHasher,
  ) {}

  async execute({ password, role = DEFAULT_ROLE, ...profile }: CreateUserInput): Promise<UserRecord> {
    const hash = password === undefined ? undefined : await this.hasher.hash(password);
    const status: UserStatus = hash === undefined ? "invited" : "active";
    return this.unitOfWork.run(async ({ users, credentials, outbox }) => {
      const user = await users.save({ id: randomUUID(), ...profile, role, status });
      if (hash !== undefined) {
        await credentials.set(user.id, hash);
      }
      await outbox.enqueue("user.created", user);
      return user;
    });
  }
}
