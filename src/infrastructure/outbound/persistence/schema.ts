import { SQL, sql } from "drizzle-orm";
import {
  AnyPgColumn,
  bigserial,
  boolean,
  check,
  index,
  integer,
  jsonb,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { ROLES, Role } from "../../../domain/value-objects/role";
import type { EventMetadata, TicketEvent } from "../../../domain/events/ticket-events";
import { TICKET_TYPES, TicketType } from "../../../domain/value-objects/ticket-type";
import { USER_STATUSES, UserStatus } from "../../../domain/entities/user";

const oneOf = (column: AnyPgColumn, values: readonly string[]): SQL =>
  sql`${column} in (${sql.join(
    values.map((value) => sql.raw(`'${value}'`)),
    sql.raw(", "),
  )})`;

export const users = pgTable(
  "users",
  {
    id: text("id").primaryKey(),
    email: text("email").notNull().unique(),
    name: text("name").notNull(),
    role: text("role").$type<Role>().notNull().default("support-agent"),
    status: text("status").$type<UserStatus>().notNull().default("invited"),
    openTickets: integer("open_tickets").notNull().default(0),
  },
  (table) => [
    check("users_role_check", oneOf(table.role, ROLES)),
    check("users_status_check", oneOf(table.status, USER_STATUSES)),
    check("users_open_tickets_check", sql`${table.openTickets} >= 0`),
    index("users_role_status_idx").on(table.role, table.status),
  ],
);

export const userCredentials = pgTable("user_credentials", {
  userId: text("user_id")
    .primaryKey()
    .references(() => users.id, { onDelete: "cascade" }),
  passwordHash: text("password_hash").notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const refreshTokens = pgTable(
  "refresh_tokens",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    familyId: text("family_id").notNull(),
    tokenHash: text("token_hash").notNull().unique(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    rotatedAt: timestamp("rotated_at", { withTimezone: true }),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("refresh_tokens_family_idx").on(table.familyId), index("refresh_tokens_user_idx").on(table.userId)],
);

export const outboxMessages = pgTable("outbox_messages", {
  id: text("id").primaryKey(),
  topic: text("topic").notNull(),
  payload: text("payload").notNull(),
  createdAt: text("created_at").notNull(),
  publishedAt: text("published_at"),
});

export const specialties = pgTable(
  "specialties",
  {
    id: text("id").primaryKey(),
    code: text("code").notNull().unique(),
    name: text("name").notNull(),
    description: text("description").notNull().default(""),
    ticketType: text("ticket_type").$type<TicketType>().notNull(),
    active: boolean("active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    check("specialties_ticket_type_check", oneOf(table.ticketType, TICKET_TYPES)),
    uniqueIndex("specialties_active_ticket_type_idx")
      .on(table.ticketType)
      .where(sql`${table.active} = true`),
  ],
);

export const agentSpecialties = pgTable(
  "agent_specialties",
  {
    agentId: text("agent_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    specialtyId: text("specialty_id")
      .notNull()
      .references(() => specialties.id),
  },
  (table) => [
    primaryKey({ columns: [table.agentId, table.specialtyId] }),
    index("agent_specialties_specialty_idx").on(table.specialtyId),
  ],
);

export const processedEvents = pgTable(
  "processed_events",
  {
    consumer: text("consumer").notNull(),
    eventId: text("event_id").notNull(),
    processedAt: timestamp("processed_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [primaryKey({ columns: [table.consumer, table.eventId] })],
);

export const agentInvitations = pgTable(
  "agent_invitations",
  {
    id: text("id").primaryKey(),
    agentId: text("agent_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    tokenHash: text("token_hash").notNull().unique(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    usedAt: timestamp("used_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("agent_invitations_agent_idx").on(table.agentId)],
);

export const ticketEvents = pgTable(
  "ticket_events",
  {
    eventId: text("event_id").primaryKey(),
    position: bigserial("position", { mode: "number" }).notNull().unique(),
    ticketId: text("ticket_id").notNull(),
    version: integer("version").notNull(),
    type: text("type").$type<TicketEvent["type"]>().notNull(),
    event: jsonb("event").$type<TicketEvent>().notNull(),
    metadata: jsonb("metadata").$type<EventMetadata>().notNull(),
    occurredAt: timestamp("occurred_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [uniqueIndex("ticket_events_ticket_version_idx").on(table.ticketId, table.version)],
);
