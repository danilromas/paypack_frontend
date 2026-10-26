CREATE TABLE "user_moderation_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"admin_user_id" uuid,
	"action" text NOT NULL,
	"reason" text DEFAULT '' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "user_moderation_action_check" CHECK ("user_moderation_events"."action" in ('restrict', 'suspend', 'reinstate', 'make_admin', 'remove_admin'))
);
--> statement-breakpoint
ALTER TABLE "user_moderation_events" ADD CONSTRAINT "user_moderation_events_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_moderation_events" ADD CONSTRAINT "user_moderation_events_admin_user_id_users_id_fk" FOREIGN KEY ("admin_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "user_moderation_events_user_idx" ON "user_moderation_events" USING btree ("user_id","created_at" DESC NULLS LAST);