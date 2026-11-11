import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { Controller, Get, Req, UseGuards } from "@nestjs/common";
import { AuthClaims } from "../../shared/contracts/token-service";
import { AuthenticatedRequest, JwtAuthGuard } from "./jwt-auth.guard";

@ApiTags("auth")
@ApiBearerAuth()
@Controller("me")
@UseGuards(JwtAuthGuard)
export class MeController {
  @Get()
  current(@Req() request: AuthenticatedRequest): AuthClaims | undefined {
    return request.claims;
  }
}
