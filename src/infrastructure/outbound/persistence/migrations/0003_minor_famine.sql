CREATE TABLE "ticket_events" (
	"event_id" text PRIMARY KEY NOT NULL,
	"position" bigserial NOT NULL,
	"ticket_id" text NOT NULL,
	"version" integer NOT NULL,
	"type" text NOT NULL,
	"event" jsonb NOT NULL,
	"metadata" jsonb NOT NULL,
	"occurred_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "ticket_events_position_unique" UNIQUE("position")
);
--> statement-breakpoint
CREATE UNIQUE INDEX "ticket_events_ticket_version_idx" ON "ticket_events" USING btree ("ticket_id","version");