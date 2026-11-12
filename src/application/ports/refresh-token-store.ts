export interface NewRefreshToken {
  id: string;
  userId: string;
  familyId: string;
  tokenHash: string;
  expiresAt: Date;
}

export type RotationResult =
  | { status: "rotated"; userId: string; familyId: string }
  | { status: "reused" | "invalid"; familyId?: string };

export interface RefreshTokenStore {
  create(token: NewRefreshToken): Promise<void>;
  rotate(tokenHash: string, now: Date): Promise<RotationResult>;
  revokeFamily(familyId: string): Promise<void>;
}
