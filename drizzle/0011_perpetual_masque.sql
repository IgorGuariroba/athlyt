CREATE TABLE "plan_experiment" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"baseline_plan_id" uuid NOT NULL,
	"experiment_plan_id" uuid NOT NULL,
	"rollback_plan_id" uuid,
	"hipotese" text NOT NULL,
	"variaveis" jsonb NOT NULL,
	"criterio_sucesso" text NOT NULL,
	"criterio_interrupcao" text NOT NULL,
	"janela_minima_semanas" integer NOT NULL,
	"estado" text DEFAULT 'ativo' NOT NULL,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"ended_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "plan_experiment" ADD CONSTRAINT "plan_experiment_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "plan_experiment" ADD CONSTRAINT "plan_experiment_baseline_plan_id_plan_id_fk" FOREIGN KEY ("baseline_plan_id") REFERENCES "public"."plan"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "plan_experiment" ADD CONSTRAINT "plan_experiment_experiment_plan_id_plan_id_fk" FOREIGN KEY ("experiment_plan_id") REFERENCES "public"."plan"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "plan_experiment" ADD CONSTRAINT "plan_experiment_rollback_plan_id_plan_id_fk" FOREIGN KEY ("rollback_plan_id") REFERENCES "public"."plan"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "plan_experiment_user_state_idx" ON "plan_experiment" USING btree ("user_id","estado");