CREATE TABLE "sync_conflict" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"session_id" uuid NOT NULL,
	"client_event_id" uuid NOT NULL,
	"motivo" text NOT NULL,
	"servidor" jsonb NOT NULL,
	"dispositivo" jsonb NOT NULL,
	"resolucao" text,
	"resolvido_em" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "workout_event" ADD COLUMN "client_event_id" uuid;--> statement-breakpoint
ALTER TABLE "workout_event" ADD COLUMN "ocorrido_em" timestamp;--> statement-breakpoint
ALTER TABLE "workout_event" ADD COLUMN "ordem" integer;--> statement-breakpoint
ALTER TABLE "sync_conflict" ADD CONSTRAINT "sync_conflict_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sync_conflict" ADD CONSTRAINT "sync_conflict_session_id_workout_session_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."workout_session"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "sync_conflict_client_event_id_idx" ON "sync_conflict" USING btree ("client_event_id");--> statement-breakpoint
CREATE UNIQUE INDEX "workout_event_client_event_id_idx" ON "workout_event" USING btree ("client_event_id");