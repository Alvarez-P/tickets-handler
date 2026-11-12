import { randomUUID } from "node:crypto";
import { Clock } from "../../ports/clock";
import { RefreshTokenStore } from "../../ports/refresh-token-store";
import { Role } from "../../../domain/value-objects/role";
import { TokenService } from "../../ports/token-service";
import { UseCase } from "../../use-case";
import { CryptoUtils } from "../../../shared/utils/crypto";

export interface IssueTokenPairInput {
  userId: string;
  roles: Role[];
  familyId?: string;
}

export interface TokenPair {
  access_token: string;
  refresh_token: string;
  token_type: "Bearer";
  expires_in: number;
}

export interface TokenPairSettings {
  accessTtlSeconds: number;
  refreshTtlDays: number;
}

const MILLISECONDS_PER_DAY = 86_400_000;

export class IssueTokenPair implements UseCase<IssueTokenPairInput, TokenPair> {
  constructor(
    private readonly tokens: TokenService,
    private readonly refreshTokens: RefreshTokenStore,
    private readonly clock: Clock,
    private readonly settings: TokenPairSettings,
  ) {}

  async execute(input: IssueTokenPairInput): Promise<TokenPair> {
    const refreshToken = CryptoUtils.randomToken();
    await this.refreshTokens.create({
      id: randomUUID(),
      userId: input.userId,
      familyId: input.familyId ?? randomUUID(),
      tokenHash: CryptoUtils.sha256(refreshToken),
      expiresAt: new Date(this.clock.now().getTime() + this.settings.refreshTtlDays * MILLISECONDS_PER_DAY),
    });
    return {
      access_token: await this.tokens.sign({ sub: input.userId, roles: input.roles }),
      refresh_token: refreshToken,
      token_type: "Bearer",
      expires_in: this.settings.accessTtlSeconds,
    };
  }
}
