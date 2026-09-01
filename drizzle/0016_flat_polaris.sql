CREATE TABLE IF NOT EXISTS "weight_goal" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"peso_gramas" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$
BEGIN
	-- Compatibilidade com a versão experimental que guardava também peso
	-- inicial e prazo. A meta continua preservada como uma versão histórica.
	IF EXISTS (
		SELECT 1 FROM information_schema.columns
		WHERE table_schema = 'public' AND table_name = 'weight_goal' AND column_name = 'peso_alvo_gramas'
	) AND NOT EXISTS (
		SELECT 1 FROM information_schema.columns
		WHERE table_schema = 'public' AND table_name = 'weight_goal' AND column_name = 'peso_gramas'
	) THEN
		ALTER TABLE "weight_goal" RENAME COLUMN "peso_alvo_gramas" TO "peso_gramas";
	END IF;
END $$;
--> statement-breakpoint
ALTER TABLE "weight_goal" DROP COLUMN IF EXISTS "peso_inicial_gramas";
--> statement-breakpoint
ALTER TABLE "weight_goal" DROP COLUMN IF EXISTS "iniciado_em";
--> statement-breakpoint
ALTER TABLE "weight_goal" DROP COLUMN IF EXISTS "prazo_em";
--> statement-breakpoint
DO $$
BEGIN
	IF NOT EXISTS (
		SELECT 1 FROM pg_constraint WHERE conname = 'weight_goal_user_id_user_id_fk'
	) THEN
		ALTER TABLE "weight_goal" ADD CONSTRAINT "weight_goal_user_id_user_id_fk"
			FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;
	END IF;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "weight_goal_user_date_idx" ON "weight_goal" USING btree ("user_id", "created_at");
