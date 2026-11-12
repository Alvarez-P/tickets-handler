import { describe, expect, it } from "vitest";
import { ReceiveTicket } from "../../src/application/use-cases/tickets/receive-ticket.use-case";
import { TransitionTicket } from "../../src/application/use-cases/tickets/transition-ticket.use-case";
import { InvalidTicketTransition, NotTicketAssignee, TicketNotFound } from "../../src/domain/errors/ticket-errors";
import { TICKET_EVENTS_TOPIC } from "../../src/domain/events/ticket-events";
import { TicketClassifier } from "../../src/domain/services/ticket-classifier";
import { Classification } from "../../src/domain/value-objects/classification";
import { InMemoryAgentRepository, InMemorySpecialtyRepository } from "../support/in-memory-staff";
import { InMemoryTicketRepository, InMemoryTicketUnitOfWork } from "../support/in-memory-tickets";

const billing: Classification = { ticketType: "billing", urgency: 2, tags: [], confidence: 0.9, source: "rules" };
const command = {
  subject: "Charged twice",
  description: "Two charges",
  customer: { email: "c@x.com", name: "C" },
  createdBy: "creator",
};

const build = async (classifier: TicketClassifier = { classify: async () => billing }) => {
  const agents = new InMemoryAgentRepository();
  const specialties = new InMemorySpecialtyRepository();
  const unitOfWork = new InMemoryTicketUnitOfWork(new InMemoryTicketRepository(), agents, specialties);
  await specialties.save({
    id: "s1",
    code: "billing",
    name: "Billing",
    description: "",
    ticketType: "billing",
    active: true,
  });
  for (const id of ["a1", "a2"]) {
    await agents.save({ id, email: `${id}@x.com`, name: id, role: "specialist-agent", status: "active" });
    await agents.setSpecialties(id, ["s1"]);
  }
  return {
    agents,
    specialties,
    unitOfWork,
    receive: new ReceiveTicket(unitOfWork, classifier),
    transition: new TransitionTicket(unitOfWork),
  };
};

describe("ReceiveTicket", () => {
  it("classifies, assigns to the least loaded agent and publishes the events", async () => {
    const { receive, unitOfWork, agents } = await build();
    agents.openTickets.set("a1", 3);
    const result = await receive.execute(command);
    expect(result).toMatchObject({ status: "assigned", assigneeId: "a2", needsManualTriage: false });
    expect(agents.openTickets.get("a2")).toBe(1);
    expect(unitOfWork.outbox.messages.map((message) => message.topic)).toEqual(Array(3).fill(TICKET_EVENTS_TOPIC));
  });

  it("flags manual triage when the classifier fails", async () => {
    const { receive } = await build({ classify: async () => null });
    expect(await receive.execute(command)).toMatchObject({ status: "received", needsManualTriage: true });
  });

  it("flags manual triage when the classifier throws", async () => {
    const { receive } = await build({
      classify: async () => {
        throw new Error("down");
      },
    });
    expect(await receive.execute(command)).toMatchObject({ status: "received", needsManualTriage: true });
  });

  it("flags manual triage when no agent is available", async () => {
    const { receive, agents } = await build();
    for (const id of ["a1", "a2"]) {
      await agents.save({ id, email: `${id}@x.com`, name: id, role: "specialist-agent", status: "disabled" });
    }
    expect(await receive.execute(command)).toMatchObject({ status: "received", assigneeId: null, needsManualTriage: true });
  });
});

describe("TransitionTicket", () => {
  it("walks the lifecycle and releases the agent load on solve", async () => {
    const { receive, transition, agents } = await build();
    const { id, assigneeId } = await receive.execute(command);
    const actorId = assigneeId ?? "";
    await transition.execute({ ticketId: id, actorId, transition: { action: "start-solving" } });
    await transition.execute({ ticketId: id, actorId, transition: { action: "pause" } });
    await transition.execute({ ticketId: id, actorId, transition: { action: "resume" } });
    const solved = await transition.execute({
      ticketId: id,
      actorId,
      transition: { action: "solve", resolution: "refunded" },
    });
    expect(solved.status).toBe("solved");
    expect(agents.openTickets.get(actorId)).toBe(0);
  });

  it("rejects unknown tickets, other actors and invalid transitions", async () => {
    const { receive, transition } = await build();
    const { id, assigneeId } = await receive.execute(command);
    await expect(
      transition.execute({ ticketId: "nope", actorId: "a1", transition: { action: "resume" } }),
    ).rejects.toBeInstanceOf(TicketNotFound);
    await expect(
      transition.execute({ ticketId: id, actorId: "intruder", transition: { action: "start-solving" } }),
    ).rejects.toBeInstanceOf(NotTicketAssignee);
    await expect(
      transition.execute({ ticketId: id, actorId: assigneeId ?? "", transition: { action: "resume" } }),
    ).rejects.toBeInstanceOf(InvalidTicketTransition);
  });
});
