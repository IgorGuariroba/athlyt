CREATE TABLE "body_assessment" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"tipo" text NOT NULL,
	"estado" text DEFAULT 'em_andamento' NOT NULL,
	"observado_em" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "body_fat_measurement" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"assessment_id" uuid,
	"user_id" uuid NOT NULL,
	"percentual_basis_points" integer NOT NULL,
	"metodo" text NOT NULL,
	"protocolo" text,
	"equipamento" text,
	"profissional" text,
	"confianca" text NOT NULL,
	"observado_em" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "body_measurement" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"assessment_id" uuid,
	"user_id" uuid NOT NULL,
	"regiao" text NOT NULL,
	"lado" text DEFAULT 'unico' NOT NULL,
	"leituras_mm" jsonb NOT NULL,
	"valor_mm" integer NOT NULL,
	"protocolo_versao" text NOT NULL,
	"qualidade" text NOT NULL,
	"condicoes" text,
	"observado_em" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "body_proportion_goal" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"regiao" text NOT NULL,
	"atual_mm" integer NOT NULL,
	"faixa_min_mm" integer NOT NULL,
	"faixa_max_mm" integer NOT NULL,
	"meta_ciclo_mm" integer NOT NULL,
	"direcao" text NOT NULL,
	"confianca" text NOT NULL,
	"justificativa" text NOT NULL,
	"metodologia_versao" text NOT NULL,
	"ativa" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "progress_photo" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"assessment_id" uuid,
	"user_id" uuid NOT NULL,
	"pose" text NOT NULL,
	"object_key" text NOT NULL,
	"condicoes" text,
	"observado_em" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "weight_measurement" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"peso_gramas" integer NOT NULL,
	"observado_em" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "body_assessment" ADD CONSTRAINT "body_assessment_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "body_fat_measurement" ADD CONSTRAINT "body_fat_measurement_assessment_id_body_assessment_id_fk" FOREIGN KEY ("assessment_id") REFERENCES "public"."body_assessment"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "body_fat_measurement" ADD CONSTRAINT "body_fat_measurement_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "body_measurement" ADD CONSTRAINT "body_measurement_assessment_id_body_assessment_id_fk" FOREIGN KEY ("assessment_id") REFERENCES "public"."body_assessment"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "body_measurement" ADD CONSTRAINT "body_measurement_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "body_proportion_goal" ADD CONSTRAINT "body_proportion_goal_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "progress_photo" ADD CONSTRAINT "progress_photo_assessment_id_body_assessment_id_fk" FOREIGN KEY ("assessment_id") REFERENCES "public"."body_assessment"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "progress_photo" ADD CONSTRAINT "progress_photo_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "weight_measurement" ADD CONSTRAINT "weight_measurement_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "body_assessment_user_date_idx" ON "body_assessment" USING btree ("user_id","observado_em");--> statement-breakpoint
CREATE INDEX "body_fat_user_method_date_idx" ON "body_fat_measurement" USING btree ("user_id","metodo","observado_em");--> statement-breakpoint
CREATE INDEX "body_measurement_user_region_date_idx" ON "body_measurement" USING btree ("user_id","regiao","observado_em");--> statement-breakpoint
CREATE INDEX "body_goal_user_active_idx" ON "body_proportion_goal" USING btree ("user_id","ativa");--> statement-breakpoint
CREATE INDEX "progress_photo_user_date_idx" ON "progress_photo" USING btree ("user_id","observado_em");--> statement-breakpoint
CREATE INDEX "weight_measurement_user_date_idx" ON "weight_measurement" USING btree ("user_id","observado_em");