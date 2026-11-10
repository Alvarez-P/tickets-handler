import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { Role } from "../../shared/contracts/role";
import { ROLES_KEY } from "./roles.decorator";
import { readClaims } from "./request-claims";

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<Role[] | undefined>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!required || required.length === 0) {
      return true;
    }
    const granted = readClaims(context)?.roles;
    if (!Array.isArray(granted) || !required.some((role) => granted.includes(role))) {
      throw new ForbiddenException();
    }
    return true;
  }
}
