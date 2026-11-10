CREATE TABLE "agent_specialties" (
	"agent_id" text NOT NULL,
	"specialty_id" text NOT NULL,
	CONSTRAINT "agent_specialties_agent_id_specialty_id_pk" PRIMARY KEY("agent_id","specialty_id")
);
--> statement-breakpoint
CREATE TABLE "specialties" (
	"id" text PRIMARY KEY NOT NULL,
	"code" text NOT NULL,
	"name" text NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"ticket_type" text NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "specialties_code_unique" UNIQUE("code"),
	CONSTRAINT "specialties_ticket_type_check" CHECK ("specialties"."ticket_type" in ('billing', 'technical', 'account', 'shipping', 'other'))
);
--> statement-breakpoint
ALTER TABLE "agent_specialties" ADD CONSTRAINT "agent_specialties_agent_id_users_id_fk" FOREIGN KEY ("agent_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agent_specialties" ADD CONSTRAINT "agent_specialties_specialty_id_specialties_id_fk" FOREIGN KEY ("specialty_id") REFERENCES "public"."specialties"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "agent_specialties_specialty_idx" ON "agent_specialties" USING btree ("specialty_id");--> statement-breakpoint
CREATE UNIQUE INDEX "specialties_active_ticket_type_idx" ON "specialties" USING btree ("ticket_type") WHERE "specialties"."active" = true;