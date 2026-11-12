import { ExecutionContext, Injectable } from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import { Observable } from "rxjs";

interface GrantRequest {
  body?: { grant_type?: unknown };
}

const PASSWORD_GRANT = "password";

@Injectable()
export class OAuthPasswordGuard extends AuthGuard("local") {
  canActivate(context: ExecutionContext): boolean | Promise<boolean> | Observable<boolean> {
    const grantType = context.switchToHttp().getRequest<GrantRequest>().body?.grant_type;
    return grantType === PASSWORD_GRANT ? super.canActivate(context) : true;
  }
}
