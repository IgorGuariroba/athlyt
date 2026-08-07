ALTER TABLE "weekly_body_review" ADD COLUMN "baseline_plan_id" uuid;--> statement-breakpoint
ALTER TABLE "weekly_body_review" ADD COLUMN "applied_plan_id" uuid;--> statement-breakpoint
ALTER TABLE "weekly_body_review" ADD COLUMN "rollback_plan_id" uuid;