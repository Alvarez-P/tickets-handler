import { InvalidCredentials } from "../../../domain/errors/auth-errors";
import { CredentialStore } from "../../../shared/contracts/credential-store";
import { PasswordHasher } from "../../../shared/contracts/password-hasher";
import { Role } from "../../../shared/contracts/role";
import { UseCase } from "../../../shared/contracts/use-case";

export interface VerifyCredentialsInput {
  email: string;
  password: string;
}

export interface VerifiedUser {
  userId: string;
  roles: Role[];
}

const ACTIVE_STATUS = "active";

export class VerifyCredentials implements UseCase<VerifyCredentialsInput, VerifiedUser> {
  constructor(
    private readonly credentials: CredentialStore,
    private readonly hasher: PasswordHasher,
    private readonly absentUserHash: string,
  ) {}

  async execute(input: VerifyCredentialsInput): Promise<VerifiedUser> {
    const stored = await this.credentials.find(input.email);
    const matches = await this.hasher.verify(input.password, stored?.hash ?? this.absentUserHash);
    if (!stored || !matches || stored.status !== ACTIVE_STATUS) {
      throw new InvalidCredentials();
    }
    return { userId: stored.userId, roles: stored.roles };
  }
}
