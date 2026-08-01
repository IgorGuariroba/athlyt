CREATE TABLE "exercise_substitution" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"session_id" uuid,
	"dia_id" text NOT NULL,
	"exercicio_original_id" text NOT NULL,
	"exercicio_novo_id" text NOT NULL,
	"motivo" text NOT NULL,
	"observacao" text,
	"persistente" boolean NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "exercise_substitution" ADD CONSTRAINT "exercise_substitution_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "exercise_substitution" ADD CONSTRAINT "exercise_substitution_session_id_workout_session_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."workout_session"("id") ON DELETE set null ON UPDATE no action;