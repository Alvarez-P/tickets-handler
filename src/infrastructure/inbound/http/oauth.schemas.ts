import { z } from "zod";

export const GRANT_TYPES = ["password", "refresh_token"] as const;

export const tokenRequestSchema = z.discriminatedUnion("grant_type", [
  z.object({ grant_type: z.literal("password"), username: z.string().min(1), password: z.string().min(1) }),
  z.object({ grant_type: z.literal("refresh_token"), refresh_token: z.string().min(1) }),
]);

export type TokenRequest = z.infer<typeof tokenRequestSchema>;
