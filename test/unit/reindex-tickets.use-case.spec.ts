import { describe, expect, it } from "vitest";
import { ProjectTicket } from "../../src/application/use-cases/tickets/project-ticket.use-case";
import { ReindexTickets } from "../../src/application/use-cases/tickets/reindex-tickets.use-case";
import { TicketView } from "../../src/application/use-cases/tickets/ticket-view.projection";
import { Ticket } from "../../src/domain/entities/ticket";
import { InMemorySearchIndex, InMemoryTicketRepository } from "../../src/shared/testing/in-memory-tickets";

const receive = (id: string) =>
  Ticket.receive(id, { subject: `s-${id}`, description: "d", customer: { email: "c@x.com", name: "C" }, createdBy: "u" });

describe("ReindexTickets", () => {
  it("projects every ticket across batches and returns the count", async () => {
    const repository = new InMemoryTicketRepository();
    for (const id of ["t1", "t2", "t3", "t4", "t5"]) {
      await repository.save(receive(id), { correlationId: id });
    }
    const index = new InMemorySearchIndex<TicketView>();
    const reindex = new ReindexTickets(repository.eventLog, new ProjectTicket(repository.eventLog, index));

    expect(await reindex.execute({ batchSize: 2 })).toBe(5);
    const { total } = await index.search("");
    expect(total).toBe(5);
  });

  it("reindexes nothing when there are no tickets", async () => {
    const repository = new InMemoryTicketRepository();
    const index = new InMemorySearchIndex<TicketView>();
    expect(await new ReindexTickets(repository.eventLog, new ProjectTicket(repository.eventLog, index)).execute()).toBe(0);
  });
});
