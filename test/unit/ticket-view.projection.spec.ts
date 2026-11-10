import { describe, expect, it } from "vitest";
import { Ticket } from "../../src/domain/entities/ticket";
import type { StoredTicketEvent, TicketEvent } from "../../src/domain/events/ticket-events";
import { projectTicketView } from "../../src/application/use-cases/tickets/ticket-view.projection";

const INPUT = {
  subject: "Error",
  description: "Falla al pagar",
  customer: { email: "ana@example.com", name: "Ana" },
  createdBy: "user-1",
};

function store(events: readonly TicketEvent[]): StoredTicketEvent[] {
  return events.map((event, index) => ({
    eventId: `e-${index + 1}`,
    position: String(index + 1),
    ticketId: "t-1",
    version: index + 1,
    occurredAt: new Date(Date.UTC(2026, 0, 1, 0, index * 10)).toISOString(),
    metadata: { correlationId: "c-1" },
    event,
  }));
}

function openTicket(): Ticket {
  const ticket = Ticket.receive("t-1", INPUT);
  ticket.classify({ ticketType: "technical", urgency: 2, tags: ["error"], confidence: 0.6, source: "rules" });
  ticket.assign({ id: "agent-1", name: "Agent One" }, { id: "spec-1", name: "Tech" });
  return ticket;
}

describe("projectTicketView", () => {
  it("projects the full flow with resolutionMinutes", () => {
    const ticket = openTicket();
    ticket.startSolving("agent-1");
    ticket.pause("agent-1");
    ticket.resume("agent-1");
    ticket.solve("agent-1", "fixed");
    const history = store(ticket.pullPendingEvents());
    const view = projectTicketView(history);
    expect(view).toMatchObject({
      id: "t-1",
      version: 7,
      status: "solved",
      subject: "Error",
      customerEmail: "ana@example.com",
      customerName: "Ana",
      createdBy: "user-1",
      createdAt: "2026-01-01T00:00:00.000Z",
      ticketType: "technical",
      urgency: 2,
      tags: ["error"],
      classificationSource: "rules",
      classificationConfidence: 0.6,
      priority: "high",
      assigneeId: "agent-1",
      assigneeName: "Agent One",
      specialtyId: "spec-1",
      specialtyName: "Tech",
      solvedAt: "2026-01-01T01:00:00.000Z",
      canceledAt: null,
      resolutionMinutes: 60,
      needsManualTriage: false,
    });
  });

  it("projects a cancellation", () => {
    const ticket = openTicket();
    ticket.cancel("agent-1", "duplicate");
    const view = projectTicketView(store(ticket.pullPendingEvents()));
    expect(view.status).toBe("canceled");
    expect(view.canceledAt).toBe("2026-01-01T00:30:00.000Z");
    expect(view.solvedAt).toBeNull();
    expect(view.resolutionMinutes).toBeNull();
  });

  it("flags manual triage on failed classification", () => {
    const ticket = Ticket.receive("t-1", INPUT);
    ticket.failClassification("down");
    const view = projectTicketView(store(ticket.pullPendingEvents()));
    expect(view.needsManualTriage).toBe(true);
    expect(view.ticketType).toBeNull();
  });
});
