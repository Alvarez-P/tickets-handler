import { DomainError } from "./domain-error";

export class InvalidCredentials extends DomainError {
  readonly code = "invalid_credentials";

  constructor() {
    super("Invalid credentials");
  }
}

export class InvalidRefreshToken extends DomainError {
  readonly code = "invalid_refresh_token";

  constructor() {
    super("Invalid refresh token");
  }
}

export class InvalidInvitation extends DomainError {
  readonly code = "invalid_invitation";

  constructor() {
    super("Invalid invitation");
  }
}
