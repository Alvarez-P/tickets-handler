export const ROLES = ["admin", "support-agent", "specialist-agent"] as const;

export type Role = (typeof ROLES)[number];
