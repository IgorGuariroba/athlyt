CREATE TABLE "plan_reassessment" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"gatilho" text NOT NULL,
	"estado" text DEFAULT 'pendente' NOT NULL,
	"impacto" text NOT NULL,
	"baseline_plan_id" uuid NOT NULL,
	"perfil_versao_anterior" integer NOT NULL,
	"perfil_versao_nova" integer NOT NULL,
	"objetivo_anterior" text NOT NULL,
	"objetivo_novo" text NOT NULL,
	"review_id" uuid,
	"candidate_plan_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"resolved_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "plan_reassessment" ADD CONSTRAINT "plan_reassessment_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "plan_reassessment" ADD CONSTRAINT "plan_reassessment_baseline_plan_id_plan_id_fk" FOREIGN KEY ("baseline_plan_id") REFERENCES "public"."plan"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "plan_reassessment" ADD CONSTRAINT "plan_reassessment_review_id_weekly_body_review_id_fk" FOREIGN KEY ("review_id") REFERENCES "public"."weekly_body_review"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "plan_reassessment" ADD CONSTRAINT "plan_reassessment_candidate_plan_id_plan_id_fk" FOREIGN KEY ("candidate_plan_id") REFERENCES "public"."plan"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "plan_reassessment_user_state_idx" ON "plan_reassessment" USING btree ("user_id","estado");