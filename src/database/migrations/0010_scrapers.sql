CREATE TABLE "scraper_logs" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"runId" uuid NOT NULL,
	"ts" timestamp NOT NULL,
	"level" varchar(10) NOT NULL,
	"stage" varchar(100),
	"message" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "scraper_runs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"scraperId" varchar(50) NOT NULL,
	"status" varchar(20) DEFAULT 'running' NOT NULL,
	"trigger" varchar(20) DEFAULT 'cron' NOT NULL,
	"startedAt" timestamp DEFAULT now() NOT NULL,
	"finishedAt" timestamp,
	"durationMs" integer,
	"stats" jsonb DEFAULT '{"fetched":0,"saved":0,"updated":0,"skipped":0,"failed":0}'::jsonb NOT NULL,
	"stages" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"progress" jsonb,
	"error" text,
	"stopRequested" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE "scrapers" (
	"id" varchar(50) PRIMARY KEY NOT NULL,
	"name" varchar(100) NOT NULL,
	"kind" varchar(20) DEFAULT 'source' NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"enabled" boolean DEFAULT true NOT NULL,
	"schedule" varchar(100),
	"nextRunAt" timestamp,
	"runRequestedAt" timestamp,
	"lastHeartbeatAt" timestamp,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "scraper_logs" ADD CONSTRAINT "scraper_logs_runId_scraper_runs_id_fk" FOREIGN KEY ("runId") REFERENCES "public"."scraper_runs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scraper_runs" ADD CONSTRAINT "scraper_runs_scraperId_scrapers_id_fk" FOREIGN KEY ("scraperId") REFERENCES "public"."scrapers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "scraper_logs_run_ts_idx" ON "scraper_logs" USING btree ("runId","ts");--> statement-breakpoint
CREATE INDEX "scraper_runs_scraper_started_idx" ON "scraper_runs" USING btree ("scraperId","startedAt");