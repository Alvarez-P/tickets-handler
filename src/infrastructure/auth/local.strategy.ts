import { Inject, Injectable } from "@nestjs/common";
import { PassportStrategy } from "@nestjs/passport";
import { Strategy } from "passport-local";
import { VerifiedUser, VerifyCredentialsInput } from "../../application/use-cases/auth/verify-credentials.use-case";
import { UseCase } from "../../application/use-case";
import { VERIFY_CREDENTIALS } from "../di/tokens";

@Injectable()
export class LocalStrategy extends PassportStrategy(Strategy, "local") {
  constructor(@Inject(VERIFY_CREDENTIALS) private readonly verifyCredentials: UseCase<VerifyCredentialsInput, VerifiedUser>) {
    super({ usernameField: "username", passwordField: "password" });
  }

  validate(username: string, password: string): Promise<VerifiedUser> {
    return this.verifyCredentials.execute({ email: username, password });
  }
}
