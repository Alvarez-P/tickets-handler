import { z } from "zod";
import { AGENT_ROLES } from "../../domain/entities/agent";
import { TICKET_TYPES } from "../../domain/value-objects/ticket-type";
import { ROLES } from "../../domain/value-objects/role";
import { USER_STATUSES } from "../../domain/entities/user";

const pagination = {
  page: z.coerce.number().int().positive().optional(),
  pageSize: z.coerce.number().int().positive().max(100).optional(),
};

const specialtyIds = z.array(z.string().min(1));

export const createSpecialtySchema = z.object({
  code: z.string().min(1),
  name: z.string().min(1),
  description: z.string().optional(),
  ticketType: z.enum(TICKET_TYPES),
  active: z.boolean().optional(),
});

export const setSpecialtyActiveSchema = z.object({ active: z.boolean() });

export const listSpecialtiesSchema = z.object({
  active: z.enum(["true", "false"]).transform((value) => value === "true").optional(),
  ...pagination,
});

export const createAgentSchema = z.object({
  email: z.email(),
  name: z.string().min(1),
  role: z.enum(ROLES),
  specialtyIds: specialtyIds.default([]),
});

export const updateAgentSchema = z.object({
  name: z.string().min(1).optional(),
  role: z.enum(ROLES).optional(),
  status: z.enum(["active", "disabled"]).optional(),
  specialtyIds: specialtyIds.optional(),
});

export const listAgentsSchema = z.object({
  role: z.enum(AGENT_ROLES).optional(),
  status: z.enum(USER_STATUSES).optional(),
  specialtyId: z.string().min(1).optional(),
  ...pagination,
});
