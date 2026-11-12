import { randomUUID } from "node:crypto";
import { Ticket } from "../../domain/entities/ticket";
import { ConcurrencyConflict } from "../../domain/errors/ticket-errors";
import { EventMetadata, StoredTicketEvent } from "../../domain/events/ticket-events";
import { AgentRepository } from "../../domain/repositories/agent.repository";
import { SpecialtyRepository } from "../../domain/repositories/specialty.repository";
import { TicketEventLog } from "../../domain/repositories/ticket-event-log";
import { TicketRepository } from "../../domain/repositories/ticket.repository";
import { SearchIndex, SearchOptions, SearchResult } from "../../application/ports/search-index";
import { TicketTransaction, TicketUnitOfWork } from "../../application/ports/ticket-unit-of-work";
import { InMemoryOutboxWriter } from "./in-memory-staff";

export class InMemoryTicketRepository implements TicketRepository {
  private readonly histories = new Map<string, StoredTicketEvent[]>();
  private position = 0;

  readonly eventLog: TicketEventLog = {
    load: async (id) => this.histories.get(id) ?? [],
    listTicketIds: async (afterId, limit) =>
      [...this.histories.keys()]
        .sort()
        .filter((id) => afterId === null || id > afterId)
        .slice(0, limit),
    maxPosition: async () => String(this.position),
    ticketIdsSince: async (position) =>
      [...this.histories.entries()]
        .filter(([, history]) => history.some((stored) => Number(stored.position) > Number(position)))
        .map(([id]) => id),
  };

  async load(id: string): Promise<Ticket | null> {
    const history = this.histories.get(id);
    return history ? Ticket.rehydrate(history) : null;
  }

  async save(ticket: Ticket, metadata: EventMetadata): Promise<StoredTicketEvent[]> {
    const events = ticket.pullPendingEvents();
    const history = this.histories.get(ticket.id) ?? [];
    const firstVersion = ticket.version - events.length + 1;
    if (firstVersion !== history.length + 1) {
      throw new ConcurrencyConflict();
    }
    const stored = events.map((event, index) => ({
      eventId: randomUUID(),
      position: String(++this.position),
      ticketId: ticket.id,
      version: firstVersion + index,
      occurredAt: new Date().toISOString(),
      metadata,
      event,
    }));
    this.histories.set(ticket.id, [...history, ...stored]);
    return stored;
  }
}

export class InMemoryTicketUnitOfWork implements TicketUnitOfWork {
  constructor(
    readonly tickets: TicketRepository,
    private readonly agents: AgentRepository,
    private readonly specialties: SpecialtyRepository,
    readonly outbox: InMemoryOutboxWriter = new InMemoryOutboxWriter(),
  ) {}

  run<TResult>(work: (transaction: TicketTransaction) => Promise<TResult>): Promise<TResult> {
    return work({
      tickets: this.tickets,
      agents: this.agents,
      specialties: this.specialties,
      outbox: this.outbox,
    });
  }
}

export class InMemorySearchIndex<TDocument extends { id: string }> implements SearchIndex<TDocument> {
  private readonly documents = new Map<string, TDocument>();

  async ensureIndex(): Promise<void> {}

  async index(document: TDocument): Promise<void> {
    this.documents.set(document.id, document);
  }

  async remove(id: string): Promise<void> {
    this.documents.delete(id);
  }

  async search(
    text: string,
    { limit = 20, offset = 0, filters = {}, sort }: SearchOptions = {},
  ): Promise<SearchResult<TDocument>> {
    const needle = text.toLowerCase();
    const matching = [...this.documents.values()]
      .filter((document) => JSON.stringify(document).toLowerCase().includes(needle))
      .filter((document) => Object.entries(filters).every(([field, value]) => Reflect.get(document, field) === value));
    if (sort) {
      const direction = sort.direction === "asc" ? 1 : -1;
      matching.sort((a, b) => {
        const left: unknown = Reflect.get(a, sort.field);
        const right: unknown = Reflect.get(b, sort.field);
        if (left === right) return a.id.localeCompare(b.id);
        if (left === null || left === undefined) return 1;
        if (right === null || right === undefined) return -1;
        return (left < right ? -1 : 1) * direction;
      });
    }
    return {
      total: matching.length,
      hits: matching.slice(offset, offset + limit).map((document) => ({ id: document.id, score: 1, document })),
    };
  }

  async close(): Promise<void> {}
}
