import { Role } from "../value-objects/role";

export const USER_STATUSES = ["invited", "active", "disabled"] as const;

export type UserStatus = (typeof USER_STATUSES)[number];

export interface UserRecord {
  id: string;
  email: string;
  name: string;
  role: Role;
  status: UserStatus;
}
