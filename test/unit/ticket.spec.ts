import { describe, expect, it } from "vitest";
import { Ticket } from "../../src/domain/entities/ticket";
import {
  InvalidTicketTransition,
  NotTicketAssignee,
  TicketNotClassified,
} from "../../src/domain/errors/ticket-errors";
import type { StoredTicketEvent, TicketEvent } from "../../src/domain/events/ticket-events";
import type { Classification } from "../../src/domain/value-objects/classification";

const INPUT = {
  subject: "Cobro duplicado",
  description: "Me cobraron dos veces",
  customer: { email: "ana@example.com", name: "Ana" },
  createdBy: "user-1",
};

const CLASSIFICATION: Classification = {
  ticketType: "billing",
  urgency: 3,
  tags: ["cobro"],
  confidence: 0.9,
  source: "laya",
};

const AGENT = { id: "agent-1", name: "Agent One" };
const SPECIALTY = { id: "spec-1", name: "Billing" };

function store(events: readonly TicketEvent[]): StoredTicketEvent[] {
  return events.map((event, index) => ({
    eventId: `e-${index + 1}`,
    position: String(index + 1),
    ticketId: "t-1",
    version: index + 1,
    occurredAt: new Date(Date.UTC(2026, 0, 1, 0, index)).toISOString(),
    metadata: { correlationId: "c-1" },
    event,
  }));
}

function snapshot(ticket: Ticket) {
  return {
    id: ticket.id,
    version: ticket.version,
    status: ticket.status,
    classification: ticket.classification,
    assigneeId: ticket.assigneeId,
    needsManualTriage: ticket.needsManualTriage,
    priority: ticket.priority,
  };
}

function assignedTicket(): Ticket {
  const ticket = Ticket.receive("t-1", INPUT);
  ticket.classify(CLASSIFICATION);
  ticket.assign(AGENT, SPECIALTY);
  return ticket;
}

describe("Ticket", () => {
  it("emits TicketReceived at version 1", () => {
    const ticket = Ticket.receive("t-1", INPUT);
    expect(ticket.version).toBe(1);
    expect(ticket.status).toBe("received");
    expect(ticket.pullPendingEvents()).toEqual([{ type: "TicketReceived", payload: INPUT }]);
  });

  it("runs the full flow", () => {
    const ticket = assignedTicket();
    expect(ticket.status).toBe("assigned");
    expect(ticket.assigneeId).toBe("agent-1");
    expect(ticket.priority).toBe("critical");
    ticket.startSolving("agent-1");
    expect(ticket.status).toBe("solving");
    ticket.pause("agent-1", "waiting customer");
    expect(ticket.status).toBe("paused");
    ticket.resume("agent-1");
    expect(ticket.status).toBe("solving");
    ticket.solve("agent-1", "fixed");
    expect(ticket.status).toBe("solved");
    expect(ticket.version).toBe(7);
  });

  it("rehydrates to the same state as the live object", () => {
    const live = assignedTicket();
    live.startSolving("agent-1");
    live.pause("agent-1");
    live.resume("agent-1");
    live.solve("agent-1", "fixed");
    const rehydrated = Ticket.rehydrate(store(live.pullPendingEvents()));
    expect(snapshot(rehydrated)).toEqual(snapshot(live));
    expect(rehydrated.pullPendingEvents()).toEqual([]);
  });

  it("classify is idempotent", () => {
    const ticket = Ticket.receive("t-1", INPUT);
    ticket.classify(CLASSIFICATION);
    ticket.classify({ ...CLASSIFICATION, ticketType: "other" });
    expect(ticket.classification?.ticketType).toBe("billing");
    expect(ticket.version).toBe(2);
  });

  it("assign without classification throws TicketNotClassified", () => {
    const ticket = Ticket.receive("t-1", INPUT);
    expect(() => ticket.assign(AGENT, SPECIALTY)).toThrow(TicketNotClassified);
  });

  it("assign to the same agent is a no-op", () => {
    const ticket = assignedTicket();
    const version = ticket.version;
    ticket.assign(AGENT, SPECIALTY);
    expect(ticket.version).toBe(version);
  });

  it("rejects actions from a different actor", () => {
    const ticket = assignedTicket();
    expect(() => ticket.startSolving("other")).toThrow(NotTicketAssignee);
    ticket.startSolving("agent-1");
    expect(() => ticket.pause("other")).toThrow(NotTicketAssignee);
    expect(() => ticket.solve("other", "x")).toThrow(NotTicketAssignee);
    ticket.pause("agent-1");
    expect(() => ticket.resume("other")).toThrow(NotTicketAssignee);
  });

  it("cancel in solved throws and cancel by anyone works otherwise", () => {
    const solved = assignedTicket();
    solved.startSolving("agent-1");
    solved.solve("agent-1", "done");
    expect(() => solved.cancel("agent-1", "late")).toThrow(InvalidTicketTransition);

    const open = assignedTicket();
    open.cancel("someone", "duplicate");
    expect(open.status).toBe("canceled");
  });

  it("failClassification flags manual triage and manual classify clears it", () => {
    const ticket = Ticket.receive("t-1", INPUT);
    ticket.failClassification("laya down");
    expect(ticket.needsManualTriage).toBe(true);
    ticket.classify({ ...CLASSIFICATION, source: "manual" });
    expect(ticket.needsManualTriage).toBe(false);
    expect(ticket.classification?.source).toBe("manual");
  });

  it("failAssignment flags manual triage", () => {
    const ticket = Ticket.receive("t-1", INPUT);
    ticket.classify(CLASSIFICATION);
    ticket.failAssignment("no-agent-available");
    expect(ticket.needsManualTriage).toBe(true);
    expect(ticket.status).toBe("received");
  });

  it("rehydrate rejects empty or non-contiguous history", () => {
    expect(() => Ticket.rehydrate([])).toThrow();
    const live = assignedTicket();
    const history = store(live.pullPendingEvents());
    const skipped = history.map((stored, index) => (index === 2 ? { ...stored, version: 5 } : stored));
    expect(() => Ticket.rehydrate(skipped)).toThrow();
  });

  it("pullPendingEvents drains the queue and keeps the version", () => {
    const ticket = assignedTicket();
    expect(ticket.pullPendingEvents()).toHaveLength(3);
    expect(ticket.pullPendingEvents()).toEqual([]);
    expect(ticket.version).toBe(3);
  });
});
