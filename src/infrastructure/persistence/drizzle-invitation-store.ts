import { randomUUID } from "node:crypto";
import { and, eq, gt, isNull } from "drizzle-orm";
import { InvitationStore } from "../../application/ports/invitation-store";
import { DrizzleClient } from "./drizzle-client";
import { agentInvitations } from "./schema";

export class DrizzleInvitationStore implements InvitationStore {
  constructor(private readonly client: DrizzleClient) {}

  issue(agentId: string, tokenHash: string, expiresAt: Date): Promise<void> {
    return this.client.transaction(async (transaction) => {
      await transaction
        .update(agentInvitations)
        .set({ usedAt: new Date() })
        .where(and(eq(agentInvitations.agentId, agentId), isNull(agentInvitations.usedAt)));
      await transaction.insert(agentInvitations).values({ id: randomUUID(), agentId, tokenHash, expiresAt });
    });
  }

  async consume(tokenHash: string, now: Date): Promise<{ agentId: string } | null> {
    const [row] = await this.client
      .update(agentInvitations)
      .set({ usedAt: now })
      .where(
        and(
          eq(agentInvitations.tokenHash, tokenHash),
          isNull(agentInvitations.usedAt),
          gt(agentInvitations.expiresAt, now),
        ),
      )
      .returning({ agentId: agentInvitations.agentId });
    return row ?? null;
  }
}
