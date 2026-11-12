import { Agent, isAgentRole } from "../../src/domain/entities/agent";
import { AgentRef } from "../../src/domain/entities/ticket";
import { AgentFilter, AgentRepository } from "../../src/domain/repositories/agent.repository";
import { SpecialtyRecord, SpecialtyRepository } from "../../src/domain/repositories/specialty.repository";
import { TicketType } from "../../src/domain/value-objects/ticket-type";
import { OutboxWriter } from "../../src/application/ports/outbox";
import { resolvePagination } from "../../src/domain/repositories/pagination";
import { Page } from "../../src/domain/repositories/query";
import { StaffTransaction, StaffUnitOfWork } from "../../src/application/ports/staff-unit-of-work";
import { User } from "../../src/domain/entities/user";
import { InMemoryRepository } from "./in-memory-repository";
import { QueuedMessage } from "./in-memory-unit-of-work";

const ALL_ROWS = Number.MAX_SAFE_INTEGER;

export class InMemorySpecialtyRepository extends InMemoryRepository<SpecialtyRecord> implements SpecialtyRepository {
  async findActiveByTicketType(ticketType: TicketType): Promise<SpecialtyRecord | null> {
    const { items } = await this.find({ where: { ticketType, active: true }, pageSize: 1 });
    return items[0] ?? null;
  }

  async findByCode(code: string): Promise<SpecialtyRecord | null> {
    const { items } = await this.find({ where: { code }, pageSize: 1 });
    return items[0] ?? null;
  }

  async findByIds(ids: string[]): Promise<SpecialtyRecord[]> {
    const found = await Promise.all(ids.map((id) => this.findById(id)));
    return found.filter((specialty): specialty is SpecialtyRecord => specialty !== null);
  }
}

export class InMemoryAgentRepository extends InMemoryRepository<User> implements AgentRepository {
  private readonly assignments = new Map<string, string[]>();
  readonly openTickets = new Map<string, number>();

  async findByEmail(email: string): Promise<User | null> {
    const { items } = await this.find({ where: { email }, pageSize: 1 });
    return items[0] ?? null;
  }

  async setSpecialties(agentId: string, specialtyIds: string[]): Promise<void> {
    this.assignments.set(agentId, [...specialtyIds]);
  }

  async findWithSpecialties(id: string): Promise<Agent | null> {
    const user = await this.findById(id);
    return user && isAgentRole(user.role) ? { ...user, role: user.role, specialtyIds: this.assignments.get(id) ?? [] } : null;
  }

  async findLeastLoaded(specialtyId: string): Promise<AgentRef | null> {
    const { items } = await this.find({ where: { status: "active" }, pageSize: ALL_ROWS });
    const candidates = items
      .filter((user) => this.assignments.get(user.id)?.includes(specialtyId))
      .sort((a, b) => (this.openTickets.get(a.id) ?? 0) - (this.openTickets.get(b.id) ?? 0) || a.id.localeCompare(b.id));
    const [chosen] = candidates;
    return chosen ? { id: chosen.id, name: chosen.name } : null;
  }

  async adjustOpenTickets(agentId: string, delta: number): Promise<void> {
    this.openTickets.set(agentId, Math.max((this.openTickets.get(agentId) ?? 0) + delta, 0));
  }

  async findAgents({ role, status, specialtyId, ...paging }: AgentFilter): Promise<Page<Agent>> {
    const { page, pageSize, offset } = resolvePagination(paging);
    const { items: users } = await this.find({ pageSize: ALL_ROWS });
    const agents = (await Promise.all(users.map((user) => this.findWithSpecialties(user.id)))).filter(
      (agent): agent is Agent =>
        agent !== null &&
        (role === undefined || agent.role === role) &&
        (status === undefined || agent.status === status) &&
        (specialtyId === undefined || agent.specialtyIds.includes(specialtyId)),
    );
    return { items: agents.slice(offset, offset + pageSize), total: agents.length, page, pageSize };
  }
}

export class InMemoryOutboxWriter implements OutboxWriter {
  readonly messages: QueuedMessage[] = [];

  async enqueue(topic: string, payload: unknown): Promise<void> {
    this.messages.push({ topic, payload });
  }
}

export class InMemoryStaffUnitOfWork implements StaffUnitOfWork {
  constructor(
    private readonly agents: AgentRepository,
    private readonly specialties: SpecialtyRepository,
    readonly outbox: InMemoryOutboxWriter = new InMemoryOutboxWriter(),
  ) {}

  run<TResult>(work: (transaction: StaffTransaction) => Promise<TResult>): Promise<TResult> {
    return work({ agents: this.agents, specialties: this.specialties, outbox: this.outbox });
  }
}
