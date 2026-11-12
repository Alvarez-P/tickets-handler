import { CanActivate, ExecutionContext, Inject, Injectable, UnauthorizedException } from "@nestjs/common";
import { TOKENS } from "../../../di/composition.module";
import { AuthClaims, TokenService } from "../../../../application/ports/token-service";
import { readRequest } from "./request-claims";
import { verifyBearer } from "./bearer";

export interface AuthenticatedRequest {
  headers: { authorization?: string };
  claims?: AuthClaims;
}

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(@Inject(TOKENS) private readonly tokens: TokenService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = readRequest(context);
    const claims = await verifyBearer(this.tokens, request.headers.authorization);
    if (!claims) {
      throw new UnauthorizedException();
    }
    request.claims = claims;
    return true;
  }
}
