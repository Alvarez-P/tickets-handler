import { Body, Controller, HttpCode, HttpStatus, Post } from "@nestjs/common";
import { CommandBus } from "@nestjs/cqrs";
import { Throttle } from "@nestjs/throttler";
import { z } from "zod";
import { AcceptInvitationCommand } from "../../application/use-cases/auth/auth.cqrs";
import { parseInput } from "./parse-input";

const ACCEPT_RATE_LIMIT = { limit: 10, ttl: 60_000 };
const MIN_PASSWORD_LENGTH = 12;

const acceptInvitationSchema = z.object({
  token: z.string().min(1),
  password: z.string().min(MIN_PASSWORD_LENGTH),
});

@Controller("invitations")
export class InvitationsController {
  constructor(private readonly commands: CommandBus) {}

  @Post("accept")
  @HttpCode(HttpStatus.NO_CONTENT)
  @Throttle({ default: ACCEPT_RATE_LIMIT })
  async accept(@Body() body: unknown): Promise<void> {
    await this.commands.execute(new AcceptInvitationCommand(parseInput(acceptInvitationSchema, body)));
  }
}
