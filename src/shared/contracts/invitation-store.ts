export interface InvitationStore {
  issue(agentId: string, tokenHash: string, expiresAt: Date): Promise<void>;
  consume(tokenHash: string, now: Date): Promise<{ agentId: string } | null>;
}
