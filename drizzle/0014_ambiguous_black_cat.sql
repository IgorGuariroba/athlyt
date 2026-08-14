ALTER TABLE "decision_trail" ADD COLUMN "contexto_enviado" jsonb;--> statement-breakpoint
ALTER TABLE "decision_trail" ADD COLUMN "instrucao_sistema" text;--> statement-breakpoint
ALTER TABLE "decision_trail" ADD COLUMN "prompt_enviado" text;