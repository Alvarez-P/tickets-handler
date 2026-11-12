import { InvalidRefreshToken } from "../../../domain/errors/auth-errors";
import { Clock } from "../../ports/clock";
import { RefreshTokenStore } from "../../ports/refresh-token-store";
import { Repository } from "../../../domain/repositories/repository";
import { UseCase } from "../../use-case";
import { UserRecord } from "../../../domain/entities/user";
import { CryptoUtils } from "../../../shared/utils/crypto";
import { IssueTokenPairInput, TokenPair } from "./issue-token-pair.use-case";

export interface RotateRefreshTokenInput {
  refreshToken: string;
}

export class RotateRefreshToken implements UseCase<RotateRefreshTokenInput, TokenPair> {
  constructor(
    private readonly refreshTokens: RefreshTokenStore,
    private readonly users: Repository<UserRecord>,
    private readonly issueTokenPair: UseCase<IssueTokenPairInput, TokenPair>,
    private readonly clock: Clock,
  ) {}

  async execute(input: RotateRefreshTokenInput): Promise<TokenPair> {
    const rotation = await this.refreshTokens.rotate(CryptoUtils.sha256(input.refreshToken), this.clock.now());
    if (rotation.status !== "rotated") {
      if (rotation.status === "reused" && rotation.familyId) {
        await this.refreshTokens.revokeFamily(rotation.familyId);
      }
      throw new InvalidRefreshToken();
    }
    const user = await this.users.findById(rotation.userId);
    if (!user || user.status !== "active") {
      await this.refreshTokens.revokeFamily(rotation.familyId);
      throw new InvalidRefreshToken();
    }
    return this.issueTokenPair.execute({ userId: user.id, roles: [user.role], familyId: rotation.familyId });
  }
}
