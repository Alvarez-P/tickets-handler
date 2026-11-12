import type { TicketView } from "../../application/use-cases/tickets/ticket-view.projection";
import { Client } from "@elastic/elasticsearch";
import { ElasticsearchSearchIndex } from "../search/elasticsearch-search-index";
import { requireElasticsearchUrl } from "../../shared/config/environment";
import { SearchIndex } from "../../application/ports/search-index";
import { UserRecord } from "../../domain/entities/user";

export const createUserSearchIndex = async (): Promise<SearchIndex<UserRecord>> => {
  const index = new ElasticsearchSearchIndex<UserRecord>(new Client({ node: requireElasticsearchUrl() }), {
    name: "users",
    searchFields: ["name", "email"],
    properties: { id: { type: "keyword" }, name: { type: "text" }, email: { type: "text" } },
  });
  await index.ensureIndex();
  return index;
};

export const createTicketSearchIndex = async (client: Client): Promise<SearchIndex<TicketView>> => {
  const index = new ElasticsearchSearchIndex<TicketView>(client, {
    name: "tickets",
    searchFields: ["subject", "description", "customerEmail", "customerName", "tags"],
    properties: {
      id: { type: "keyword" },
      status: { type: "keyword" },
      assigneeId: { type: "keyword" },
      specialtyId: { type: "keyword" },
      ticketType: { type: "keyword" },
      priority: { type: "keyword" },
      tags: { type: "keyword" },
      urgency: { type: "integer" },
      createdAt: { type: "date" },
      assignedAt: { type: "date" },
      solvedAt: { type: "date" },
      subject: { type: "text" },
      description: { type: "text" },
      customerEmail: { type: "text" },
      customerName: { type: "text" },
    },
  });
  await index.ensureIndex();
  return index;
};
