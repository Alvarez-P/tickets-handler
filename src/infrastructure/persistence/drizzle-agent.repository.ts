import { and, count, asc, eq, inArray, sql } from "drizzle-orm";
import { AgentRef } from "../../domain/entities/ticket";
import { Agent, AGENT_ROLES, AgentRole, isAgentRole } from "../../domain/entities/agent";
import { AgentFilter, AgentRepository } from "../../domain/repositories/agent.repository";
import { resolvePagination } from "../../domain/repositories/pagination";
import { Page } from "../../domain/repositories/query";
import { UserRecord } from "../../domain/entities/user";
import { DrizzleBaseRepository } from "./drizzle-base.repository";
import { DrizzleClient } from "./drizzle-client";
import { agentSpecialties, users } from "./schema";

const toUserRecord = (row: typeof users.$inferSelect): UserRecord => ({
  id: row.id,
  email: row.email,
  name: row.name,
  role: row.role,
  status: row.status,
});

const toAgent = (row: typeof users.$inferSelect, role: AgentRole, specialtyIds: string[]): Agent => ({
  ...toUserRecord(row),
  role,
  specialtyIds,
});

export class DrizzleAgentRepository extends DrizzleBaseRepository<UserRecord> implements AgentRepository {
  constructor(private readonly db: DrizzleClient) {
    super(db, users);
  }

  async findByEmail(email: string): Promise<UserRecord | null> {
    const [row] = await this.db.select().from(users).where(eq(users.email, email));
    return row ? toUserRecord(row) : null;
  }

  async setSpecialties(agentId: string, specialtyIds: string[]): Promise<void> {
    await this.db.delete(agentSpecialties).where(eq(agentSpecialties.agentId, agentId));
    if (specialtyIds.length > 0) {
      await this.db.insert(agentSpecialties).values(specialtyIds.map((specialtyId) => ({ agentId, specialtyId })));
    }
  }

  async findWithSpecialties(id: string): Promise<Agent | null> {
    const [row] = await this.db.select().from(users).where(eq(users.id, id));
    if (!row || !isAgentRole(row.role)) {
      return null;
    }
    const assigned = await this.db.select().from(agentSpecialties).where(eq(agentSpecialties.agentId, id));
    return toAgent(row, row.role, assigned.map((entry) => entry.specialtyId));
  }

  async findLeastLoaded(specialtyId: string): Promise<AgentRef | null> {
    const [row] = await this.db
      .select({ id: users.id, name: users.name })
      .from(users)
      .innerJoin(agentSpecialties, eq(agentSpecialties.agentId, users.id))
      .where(and(eq(agentSpecialties.specialtyId, specialtyId), eq(users.status, "active")))
      .orderBy(asc(users.openTickets), asc(users.id))
      .limit(1)
      .for("update", { of: users, skipLocked: true });
    return row ?? null;
  }

  async adjustOpenTickets(agentId: string, delta: number): Promise<void> {
    await this.db
      .update(users)
      .set({ openTickets: sql`greatest(${users.openTickets} + ${delta}, 0)` })
      .where(eq(users.id, agentId));
  }

  async findAgents(filter: AgentFilter): Promise<Page<Agent>> {
    const { page, pageSize, offset } = resolvePagination(filter);
    const conditions = [
      inArray(users.role, filter.role ? [filter.role] : [...AGENT_ROLES]),
      ...(filter.status ? [eq(users.status, filter.status)] : []),
      ...(filter.specialtyId
        ? [
            inArray(
              users.id,
              this.db
                .select({ agentId: agentSpecialties.agentId })
                .from(agentSpecialties)
                .where(eq(agentSpecialties.specialtyId, filter.specialtyId)),
            ),
          ]
        : []),
    ];
    const where = and(...conditions);
    const rows = await this.db.select().from(users).where(where).orderBy(asc(users.email)).limit(pageSize).offset(offset);
    const [{ total }] = await this.db.select({ total: count() }).from(users).where(where);
    const assigned =
      rows.length === 0
        ? []
        : await this.db
            .select()
            .from(agentSpecialties)
            .where(
              inArray(
                agentSpecialties.agentId,
                rows.map((row) => row.id),
              ),
            );
    const items = rows.flatMap((row) =>
      isAgentRole(row.role)
        ? [
            toAgent(
              row,
              row.role,
              assigned.filter((entry) => entry.agentId === row.id).map((entry) => entry.specialtyId),
            ),
          ]
        : [],
    );
    return { items, total, page, pageSize };
  }
}
