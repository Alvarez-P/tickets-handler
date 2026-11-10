import { z } from "zod";
import { TICKET_PRIORITIES } from "../../domain/services/ticket-priority";
import { TICKET_STATUSES } from "../../domain/value-objects/ticket-status";
import { TICKET_TYPES } from "../../domain/value-objects/ticket-type";

export const receiveTicketSchema = z.object({
  subject: z.string().min(1),
  description: z.string().min(1),
  customer: z.object({ email: z.email(), name: z.string().min(1) }),
});

export const transitionTicketSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("start-solving") }),
  z.object({ action: z.literal("pause"), reason: z.string().min(1).optional() }),
  z.object({ action: z.literal("resume") }),
  z.object({ action: z.literal("solve"), resolution: z.string().min(1) }),
  z.object({ action: z.literal("cancel"), reason: z.string().min(1) }),
]);

export const searchTicketsSchema = z
  .object({
    text: z.string().min(1).optional(),
    status: z.enum(TICKET_STATUSES).optional(),
    assigneeId: z.string().min(1).optional(),
    ticketType: z.enum(TICKET_TYPES).optional(),
    priority: z.enum(TICKET_PRIORITIES).optional(),
    sortBy: z.enum(["createdAt", "assignedAt", "solvedAt", "urgency"]).optional(),
    order: z.enum(["asc", "desc"]).default("desc"),
    limit: z.coerce.number().int().positive().max(100).optional(),
    offset: z.coerce.number().int().nonnegative().optional(),
  })
  .transform(({ text, limit, offset, sortBy, order, ...filters }) => ({
    ...(text === undefined ? {} : { text }),
    ...(limit === undefined ? {} : { limit }),
    ...(offset === undefined ? {} : { offset }),
    ...(sortBy === undefined ? {} : { sort: { field: sortBy, direction: order } }),
    filters: Object.fromEntries(Object.entries(filters).filter(([, value]) => value !== undefined)),
  }));
