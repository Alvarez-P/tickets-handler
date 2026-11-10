import { eq } from "drizzle-orm";
import { CredentialStore, StoredCredential } from "../../shared/contracts/credential-store";
import { DrizzleClient } from "./drizzle-client";
import { userCredentials, users } from "./schema";

export class DrizzleCredentialStore implements CredentialStore {
  constructor(private readonly client: DrizzleClient) {}

  async set(userId: string, hash: string): Promise<void> {
    await this.client
      .insert(userCredentials)
      .values({ userId, passwordHash: hash })
      .onConflictDoUpdate({ target: userCredentials.userId, set: { passwordHash: hash, updatedAt: new Date() } });
  }

  async find(email: string): Promise<StoredCredential | null> {
    const [row] = await this.client
      .select({ userId: users.id, role: users.role, status: users.status, hash: userCredentials.passwordHash })
      .from(users)
      .innerJoin(userCredentials, eq(userCredentials.userId, users.id))
      .where(eq(users.email, email));
    return row ? { userId: row.userId, roles: [row.role], status: row.status, hash: row.hash } : null;
  }
}
