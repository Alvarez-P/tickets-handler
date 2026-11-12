import type { Role } from "../value-objects/role";

export const USER_STATUSES = ["invited", "active", "disabled"] as const;

export type UserStatus = (typeof USER_STATUSES)[number];

export const DEFAULT_USER_ROLE: Role = "support-agent";

export interface User {
  id: string;
  email: string;
  name: string;
  role: Role;
  status: UserStatus;
}

export interface UserRegistration {
  email: string;
  name: string;
  role?: Role;
  hasCredentials: boolean;
}

export const registerUser = (id: string, { email, name, role = DEFAULT_USER_ROLE, hasCredentials }: UserRegistration): User => ({
  id,
  email,
  name,
  role,
  status: hasCredentials ? "active" : "invited",
});
