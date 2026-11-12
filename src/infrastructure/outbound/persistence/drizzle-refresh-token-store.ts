import { and, eq, gt, isNull } from "drizzle-orm";
import { NewRefreshToken, RefreshTokenStore, RotationResult } from "../../../application/ports/refresh-token-store";
import { DrizzleClient } from "./drizzle-client";
import { refreshTokens } from "./schema";

export class DrizzleRefreshTokenStore implements RefreshTokenStore {
  constructor(private readonly client: DrizzleClient) {}

  async create(token: NewRefreshToken): Promise<void> {
    await this.client.insert(refreshTokens).values(token);
  }

  async rotate(tokenHash: string, now: Date): Promise<RotationResult> {
    const [rotated] = await this.client
      .update(refreshTokens)
      .set({ rotatedAt: now })
      .where(
        and(
          eq(refreshTokens.tokenHash, tokenHash),
          isNull(refreshTokens.rotatedAt),
          isNull(refreshTokens.revokedAt),
          gt(refreshTokens.expiresAt, now),
        ),
      )
      .returning({ userId: refreshTokens.userId, familyId: refreshTokens.familyId });
    if (rotated) {
      return { status: "rotated", ...rotated };
    }
    const [existing] = await this.client
      .select({ familyId: refreshTokens.familyId, rotatedAt: refreshTokens.rotatedAt, revokedAt: refreshTokens.revokedAt })
      .from(refreshTokens)
      .where(eq(refreshTokens.tokenHash, tokenHash));
    if (existing && (existing.rotatedAt || existing.revokedAt)) {
      return { status: "reused", familyId: existing.familyId };
    }
    return { status: "invalid" };
  }

  async revokeFamily(familyId: string): Promise<void> {
    await this.client
      .update(refreshTokens)
      .set({ revokedAt: new Date() })
      .where(and(eq(refreshTokens.familyId, familyId), isNull(refreshTokens.revokedAt)));
  }
}
