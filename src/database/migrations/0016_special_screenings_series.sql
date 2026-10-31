CREATE TABLE "series" (
	"id" serial PRIMARY KEY NOT NULL,
	"slug" varchar(255) NOT NULL,
	"name" varchar(255) NOT NULL,
	"type" varchar(20) NOT NULL,
	"organizer" varchar(100),
	"isChainProgramme" boolean DEFAULT false NOT NULL,
	"description" text,
	"firstSeenAt" timestamp DEFAULT now() NOT NULL,
	"lastSeenAt" timestamp DEFAULT now() NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "series_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "series_aliases" (
	"alias" varchar(255) PRIMARY KEY NOT NULL,
	"seriesId" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ticketing_matches" (
	"key" varchar(500) PRIMARY KEY NOT NULL,
	"provider" varchar(50) NOT NULL,
	"rawTitle" varchar(500) NOT NULL,
	"status" varchar(20) NOT NULL,
	"filmwebId" integer,
	"title" varchar(500),
	"year" integer,
	"method" varchar(30),
	"confidence" real,
	"note" text,
	"result" jsonb NOT NULL,
	"manual" boolean DEFAULT false NOT NULL,
	"reviewedAt" timestamp,
	"cinemas" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"screenings" integer DEFAULT 0 NOT NULL,
	"checkedAt" timestamp DEFAULT now() NOT NULL,
	"lastSeenAt" timestamp DEFAULT now() NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "screenings" ADD COLUMN "specialType" varchar(20);--> statement-breakpoint
ALTER TABLE "screenings" ADD COLUMN "specialLabel" varchar(255);--> statement-breakpoint
ALTER TABLE "screenings" ADD COLUMN "editionNote" varchar(100);--> statement-breakpoint
ALTER TABLE "screenings" ADD COLUMN "seriesId" integer;--> statement-breakpoint
ALTER TABLE "series_aliases" ADD CONSTRAINT "series_aliases_seriesId_series_id_fk" FOREIGN KEY ("seriesId") REFERENCES "public"."series"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "screenings" ADD CONSTRAINT "screenings_seriesId_series_id_fk" FOREIGN KEY ("seriesId") REFERENCES "public"."series"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "screenings_series_id_idx" ON "screenings" USING btree ("seriesId");