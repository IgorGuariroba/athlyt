CREATE TABLE "consent" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"userId" uuid NOT NULL,
	"operacao" text NOT NULL,
	"campo" text NOT NULL,
	"recorte_versao" integer NOT NULL,
	"provedor" text NOT NULL,
	"concedido_em" timestamp DEFAULT now() NOT NULL,
	"revogado_em" timestamp
);
--> statement-breakpoint
CREATE TABLE "decision_trail" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"userId" uuid NOT NULL,
	"operacao" text NOT NULL,
	"recorte_versao" integer NOT NULL,
	"perfil_versao" integer NOT NULL,
	"modelo_solicitado" text NOT NULL,
	"modelo_resolvido" text,
	"auditavel" boolean NOT NULL,
	"degradado" boolean NOT NULL,
	"campos_enviados" jsonb NOT NULL,
	"campos_omitidos" jsonb NOT NULL,
	"ferramentas_consultadas" jsonb NOT NULL,
	"resultado" jsonb,
	"erro" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "consent" ADD CONSTRAINT "consent_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "decision_trail" ADD CONSTRAINT "decision_trail_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;