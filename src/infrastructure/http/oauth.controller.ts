import { ApiTags } from "@nestjs/swagger";
import { ApiZodBody } from "./api-docs";
import {
  Body,
  Controller,
  Header,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  UnauthorizedException,
  UseFilters,
  UseGuards,
} from "@nestjs/common";
import { CommandBus } from "@nestjs/cqrs";
import { Throttle } from "@nestjs/throttler";
import { IssueTokensCommand, RefreshTokensCommand } from "../../application/use-cases/auth/auth.cqrs";
import { TokenPair } from "../../application/use-cases/auth/issue-token-pair.use-case";
import { VerifiedUser } from "../../application/use-cases/auth/verify-credentials.use-case";
import { OAuthPasswordGuard } from "../auth/oauth-password.guard";
import { OAuthError, OAuthGrantErrorFilter } from "./oauth-error";
import { GRANT_TYPES, tokenRequestSchema } from "./oauth.schemas";

const TOKEN_RATE_LIMIT = { limit: 10, ttl: 60_000 };

interface PasswordGrantRequest {
  user?: VerifiedUser;
}

const rejectMalformed = (body: unknown): never => {
  const grantType = typeof body === "object" && body !== null && "grant_type" in body ? body.grant_type : undefined;
  const isKnown = GRANT_TYPES.some((known) => known === grantType);
  throw new OAuthError(grantType === undefined || isKnown ? "invalid_request" : "unsupported_grant_type");
};

@ApiTags("auth")
@Controller("oauth")
@UseFilters(OAuthGrantErrorFilter)
export class OAuthController {
  constructor(private readonly commands: CommandBus) {}

  @Post("token")
  @ApiZodBody(tokenRequestSchema)
  @HttpCode(HttpStatus.OK)
  @Header("Cache-Control", "no-store")
  @Throttle({ default: TOKEN_RATE_LIMIT })
  @UseGuards(OAuthPasswordGuard)
  async token(@Req() request: PasswordGrantRequest, @Body() body: unknown): Promise<TokenPair> {
    const parsed = tokenRequestSchema.safeParse(body);
    if (!parsed.success) {
      return rejectMalformed(body);
    }
    if (parsed.data.grant_type === "refresh_token") {
      return this.commands.execute(new RefreshTokensCommand(parsed.data.refresh_token));
    }
    if (!request.user) {
      throw new UnauthorizedException();
    }
    return this.commands.execute(new IssueTokensCommand(request.user.userId, request.user.roles));
  }
}
