import { InvalidInvitation } from "../../../domain/errors/auth-errors";
import { CacheInvalidator } from "../../../shared/contracts/cache";
import { Clock } from "../../../shared/contracts/clock";
import { InvitationStore } from "../../../shared/contracts/invitation-store";
import { PasswordHasher } from "../../../shared/contracts/password-hasher";
import { UserUnitOfWork } from "../../../shared/contracts/unit-of-work";
import { UseCase } from "../../../shared/contracts/use-case";
import { CryptoUtils } from "../../../shared/utils/crypto";

export interface AcceptInvitationInput {
  token: string;
  password: string;
}

export class AcceptInvitation implements UseCase<AcceptInvitationInput, void> {
  constructor(
    private readonly invitations: InvitationStore,
    private readonly unitOfWork: UserUnitOfWork,
    private readonly hasher: PasswordHasher,
    private readonly clock: Clock,
    private readonly userCache: CacheInvalidator,
  ) {}

  async execute({ token, password }: AcceptInvitationInput): Promise<void> {
    const invitation = await this.invitations.consume(CryptoUtils.sha256(token), this.clock.now());
    if (invitation === null) {
      throw new InvalidInvitation();
    }
    const hash = await this.hasher.hash(password);
    await this.unitOfWork.run(async ({ users, credentials }) => {
      const user = await users.findById(invitation.agentId);
      if (user === null || user.status !== "invited") {
        throw new InvalidInvitation();
      }
      await credentials.set(user.id, hash);
      await users.save({ ...user, status: "active" });
    });
    await this.userCache.invalidate(invitation.agentId);
  }
}
