import { Clock } from "../../application/ports/clock";
import { CredentialStore, StoredCredential } from "../../application/ports/credential-store";
import { NewRefreshToken, RefreshTokenStore, RotationResult } from "../../application/ports/refresh-token-store";
import { QueryableRepository } from "../../domain/repositories/queryable-repository";
import { User } from "../../domain/entities/user";

export class InMemoryCredentialStore implements CredentialStore {
  private readonly hashes = new Map<string, string>();

  constructor(private readonly users: QueryableRepository<User>) {}

  async set(userId: string, hash: string): Promise<void> {
    this.hashes.set(userId, hash);
  }

  async find(email: string): Promise<StoredCredential | null> {
    const { items } = await this.users.find({ where: { email }, pageSize: 1 });
    const user = items[0];
    const hash = user && this.hashes.get(user.id);
    return user && hash ? { userId: user.id, roles: [user.role], status: user.status, hash } : null;
  }
}

interface StoredRefreshToken extends NewRefreshToken {
  rotatedAt?: Date;
  revokedAt?: Date;
}

export class InMemoryRefreshTokenStore implements RefreshTokenStore {
  private readonly tokens = new Map<string, StoredRefreshToken>();

  async create(token: NewRefreshToken): Promise<void> {
    this.tokens.set(token.tokenHash, { ...token });
  }

  async rotate(tokenHash: string, now: Date): Promise<RotationResult> {
    const token = this.tokens.get(tokenHash);
    if (!token) {
      return { status: "invalid" };
    }
    if (token.rotatedAt || token.revokedAt) {
      return { status: "reused", familyId: token.familyId };
    }
    if (token.expiresAt <= now) {
      return { status: "invalid" };
    }
    token.rotatedAt = now;
    return { status: "rotated", userId: token.userId, familyId: token.familyId };
  }

  async revokeFamily(familyId: string): Promise<void> {
    for (const token of this.tokens.values()) {
      if (token.familyId === familyId) {
        token.revokedAt ??= new Date();
      }
    }
  }
}

export class FixedClock implements Clock {
  constructor(private current: Date) {}

  now(): Date {
    return this.current;
  }

  advanceSeconds(seconds: number): void {
    this.current = new Date(this.current.getTime() + seconds * 1000);
  }
}
