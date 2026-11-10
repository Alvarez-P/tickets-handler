import { ArgumentsHost, Catch, ExceptionFilter, HttpStatus } from "@nestjs/common";
import { DomainError } from "../../domain/errors/domain-error";

export const domainErrorStatuses: Record<string, number> = {
  invalid_credentials: HttpStatus.UNAUTHORIZED,
  invalid_refresh_token: HttpStatus.UNAUTHORIZED,
  invalid_invitation: HttpStatus.BAD_REQUEST,
  specialty_code_taken: HttpStatus.CONFLICT,
  active_specialty_exists_for_type: HttpStatus.CONFLICT,
  email_already_registered: HttpStatus.CONFLICT,
  specialty_not_found: HttpStatus.NOT_FOUND,
  agent_not_found: HttpStatus.NOT_FOUND,
  ticket_not_found: HttpStatus.NOT_FOUND,
  not_ticket_assignee: HttpStatus.FORBIDDEN,
  invalid_ticket_transition: HttpStatus.UNPROCESSABLE_ENTITY,
  invalid_agent_role: HttpStatus.UNPROCESSABLE_ENTITY,
  specialist_requires_specialties: HttpStatus.UNPROCESSABLE_ENTITY,
  invalid_agent_status_transition: HttpStatus.UNPROCESSABLE_ENTITY,
};

export interface ErrorResponse {
  status(code: number): { json(body: unknown): unknown };
}

@Catch(DomainError)
export class DomainErrorFilter implements ExceptionFilter<DomainError> {
  catch(error: DomainError, host: ArgumentsHost): void {
    if (host.getType() !== "http") {
      throw error;
    }
    const status = domainErrorStatuses[error.code] ?? HttpStatus.CONFLICT;
    host.switchToHttp().getResponse<ErrorResponse>().status(status).json({ code: error.code, message: error.message });
  }
}
