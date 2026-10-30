ALTER TABLE "cities" ADD COLUMN "createdAt" timestamp DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "scraper_runs" ADD COLUMN "created" jsonb;