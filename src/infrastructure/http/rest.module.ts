import { Module } from "@nestjs/common";
import { PassportModule } from "@nestjs/passport";
import { LocalStrategy } from "../auth/local.strategy";
import { OAuthPasswordGuard } from "../auth/oauth-password.guard";
import { AdminAgentsController } from "./admin-agents.controller";
import { AdminSpecialtiesController } from "./admin-specialties.controller";
import { HealthController } from "./health.controller";
import { InvitationsController } from "./invitations.controller";
import { JwtAuthGuard } from "./jwt-auth.guard";
import { MeController } from "./me.controller";
import { OAuthController } from "./oauth.controller";
import { TicketsController } from "./tickets.controller";
import { UsersController } from "./users.controller";

@Module({
  imports: [PassportModule.register({ session: false })],
  controllers: [
    HealthController,
    UsersController,
    MeController,
    OAuthController,
    InvitationsController,
    AdminSpecialtiesController,
    AdminAgentsController,
    TicketsController,
  ],
  providers: [JwtAuthGuard, OAuthPasswordGuard, LocalStrategy],
})
export class RestModule {}
