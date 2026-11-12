import { InvitationStore } from "../../src/application/ports/invitation-store";

interface StoredInvitation {
  agentId: string;
  expiresAt: Date;
  usedAt?: Date;
}

export class InMemoryInvitationStore implements InvitationStore {
  private readonly invitations = new Map<string, StoredInvitation>();

  async issue(agentId: string, tokenHash: string, expiresAt: Date): Promise<void> {
    for (const invitation of this.invitations.values()) {
      if (invitation.agentId === agentId) {
        invitation.usedAt ??= new Date();
      }
    }
    this.invitations.set(tokenHash, { agentId, expiresAt });
  }

  async consume(tokenHash: string, now: Date): Promise<{ agentId: string } | null> {
    const invitation = this.invitations.get(tokenHash);
    if (!invitation || invitation.usedAt || invitation.expiresAt <= now) {
      return null;
    }
    invitation.usedAt = now;
    return { agentId: invitation.agentId };
  }
}
