import { CustomDecorator, SetMetadata } from "@nestjs/common";
import { Role } from "../../shared/contracts/role";

export const ROLES_KEY = "roles";

export const Roles = (...roles: Role[]): CustomDecorator<string> => SetMetadata(ROLES_KEY, roles);
