import { Role } from "../../domain/value-objects/role";

export interface StoredCredential {
  userId: string;
  roles: Role[];
  status: string;
  hash: string;
}

export interface CredentialStore {
  set(userId: string, hash: string): Promise<void>;
  find(email: string): Promise<StoredCredential | null>;
}
