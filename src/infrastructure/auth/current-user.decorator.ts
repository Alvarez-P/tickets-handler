import { ExecutionContext, createParamDecorator } from "@nestjs/common";
import { AuthClaims } from "../../shared/contracts/token-service";
import { readClaims } from "./request-claims";

export const CurrentUser = createParamDecorator(
  (_data: unknown, context: ExecutionContext): Partial<AuthClaims> | undefined => readClaims(context),
);
