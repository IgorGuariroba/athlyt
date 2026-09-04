ALTER TABLE "decision_trail" ADD COLUMN "rotas_configuradas" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "decision_trail" ADD COLUMN "tentativas_modelo" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "decision_trail" ADD COLUMN "desfecho" text DEFAULT 'ok' NOT NULL;