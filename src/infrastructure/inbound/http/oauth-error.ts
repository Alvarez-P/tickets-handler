import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus, UnauthorizedException } from "@nestjs/common";
import { DomainError } from "../../../domain/errors/domain-error";
import { ErrorResponse } from "./domain-error.filter";

export type OAuthErrorCode = "invalid_grant" | "invalid_request" | "unsupported_grant_type";

export class OAuthError extends HttpException {
  constructor(error: OAuthErrorCode) {
    super({ error }, HttpStatus.BAD_REQUEST);
  }
}

@Catch(DomainError, UnauthorizedException)
export class OAuthGrantErrorFilter implements ExceptionFilter {
  catch(_error: DomainError | UnauthorizedException, host: ArgumentsHost): void {
    const body: { error: OAuthErrorCode } = { error: "invalid_grant" };
    host.switchToHttp().getResponse<ErrorResponse>().status(HttpStatus.BAD_REQUEST).json(body);
  }
}
