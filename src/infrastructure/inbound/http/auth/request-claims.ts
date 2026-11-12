import { ExecutionContext } from "@nestjs/common";
import { GqlExecutionContext } from "@nestjs/graphql";
import { AuthClaims } from "../../../../application/ports/token-service";

export interface ClaimsCarrier {
  headers: { authorization?: string };
  claims?: Partial<AuthClaims>;
}

export const readRequest = (context: ExecutionContext): ClaimsCarrier => {
  if (context.getType<string>() === "graphql") {
    return GqlExecutionContext.create(context).getContext<{ req: ClaimsCarrier }>().req;
  }
  return context.switchToHttp().getRequest<ClaimsCarrier>();
};

export const readClaims = (context: ExecutionContext): Partial<AuthClaims> | undefined =>
  readRequest(context).claims;
