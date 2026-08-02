CREATE TABLE "body_visual_analysis" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"photo_ids" jsonb NOT NULL,
	"criterios" jsonb NOT NULL,
	"gordura_min_basis_points" integer NOT NULL,
	"gordura_max_basis_points" integer NOT NULL,
	"observacoes" jsonb NOT NULL,
	"limitacoes" jsonb NOT NULL,
	"confianca" text NOT NULL,
	"metodologia_versao" text NOT NULL,
	"modelo_resolvido" text NOT NULL,
	"ativa" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "weekly_body_review" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"periodo_inicio" timestamp with time zone NOT NULL,
	"periodo_fim" timestamp with time zone NOT NULL,
	"scorecard" jsonb NOT NULL,
	"confiancas" jsonb NOT NULL,
	"evidencias" jsonb NOT NULL,
	"proposta" jsonb NOT NULL,
	"estado" text DEFAULT 'pendente' NOT NULL,
	"metodologia_versao" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "progress_photo" ADD COLUMN "protocolo_versao" text DEFAULT 'foto-v1' NOT NULL;--> statement-breakpoint
ALTER TABLE "progress_photo" ADD COLUMN "excluir_em" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "body_visual_analysis" ADD CONSTRAINT "body_visual_analysis_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "weekly_body_review" ADD CONSTRAINT "weekly_body_review_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "body_visual_user_date_idx" ON "body_visual_analysis" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX "weekly_body_review_user_date_idx" ON "weekly_body_review" USING btree ("user_id","periodo_fim");