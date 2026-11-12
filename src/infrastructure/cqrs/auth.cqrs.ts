import { Inject } from "@nestjs/common";
import { CommandHandler, ICommandHandler } from "@nestjs/cqrs";
import { UseCase } from "../../application/use-case";
import { Role } from "../../domain/value-objects/role";
import { Command } from "./cqrs";
import { ACCEPT_INVITATION, ISSUE_TOKEN_PAIR, ROTATE_REFRESH_TOKEN } from "../di/tokens";
import { AcceptInvitationInput } from "../../application/use-cases/auth/accept-invitation.use-case";
import { IssueTokenPairInput, TokenPair } from "../../application/use-cases/auth/issue-token-pair.use-case";
import { RotateRefreshTokenInput } from "../../application/use-cases/auth/rotate-refresh-token.use-case";

export class IssueTokensCommand extends Command<TokenPair> {
  constructor(
    readonly userId: string,
    readonly roles: Role[],
  ) {
    super();
  }
}

export class RefreshTokensCommand extends Command<TokenPair> {
  constructor(readonly refreshToken: string) {
    super();
  }
}

export class AcceptInvitationCommand extends Command<void> {
  constructor(readonly input: AcceptInvitationInput) {
    super();
  }
}

@CommandHandler(IssueTokensCommand)
export class IssueTokensHandler implements ICommandHandler<IssueTokensCommand, TokenPair> {
  constructor(@Inject(ISSUE_TOKEN_PAIR) private readonly issueTokenPair: UseCase<IssueTokenPairInput, TokenPair>) {}

  execute(command: IssueTokensCommand): Promise<TokenPair> {
    return this.issueTokenPair.execute({ userId: command.userId, roles: command.roles });
  }
}

@CommandHandler(RefreshTokensCommand)
export class RefreshTokensHandler implements ICommandHandler<RefreshTokensCommand, TokenPair> {
  constructor(
    @Inject(ROTATE_REFRESH_TOKEN) private readonly rotateRefreshToken: UseCase<RotateRefreshTokenInput, TokenPair>,
  ) {}

  execute(command: RefreshTokensCommand): Promise<TokenPair> {
    return this.rotateRefreshToken.execute({ refreshToken: command.refreshToken });
  }
}

@CommandHandler(AcceptInvitationCommand)
export class AcceptInvitationHandler implements ICommandHandler<AcceptInvitationCommand, void> {
  constructor(@Inject(ACCEPT_INVITATION) private readonly acceptInvitation: UseCase<AcceptInvitationInput, void>) {}

  execute(command: AcceptInvitationCommand): Promise<void> {
    return this.acceptInvitation.execute(command.input);
  }
}

export const authCqrsHandlers = [IssueTokensHandler, RefreshTokensHandler, AcceptInvitationHandler];
