CREATE TABLE "food_entry" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"plan_id" uuid,
	"refeicao_ref" text,
	"dia_alimentar" text NOT NULL,
	"nome" text NOT NULL,
	"origem" text NOT NULL,
	"itens" jsonb NOT NULL,
	"macros" jsonb NOT NULL,
	"planejado" jsonb,
	"consumido_em" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "food_entry" ADD CONSTRAINT "food_entry_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "food_entry" ADD CONSTRAINT "food_entry_plan_id_plan_id_fk" FOREIGN KEY ("plan_id") REFERENCES "public"."plan"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "food_entry_refeicao_do_dia_idx" ON "food_entry" USING btree ("user_id","dia_alimentar","refeicao_ref");