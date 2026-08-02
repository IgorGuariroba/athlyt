CREATE TABLE "food_library" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"alimento_id" text,
	"nome" text NOT NULL,
	"favorito" boolean DEFAULT false NOT NULL,
	"por_100g" jsonb,
	"porcoes" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "food_library" ADD CONSTRAINT "food_library_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "food_library_alimento_idx" ON "food_library" USING btree ("user_id","alimento_id");