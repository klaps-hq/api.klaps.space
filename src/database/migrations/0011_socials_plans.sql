CREATE TABLE "socials_plan_media" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"planId" uuid NOT NULL,
	"position" integer DEFAULT 0 NOT NULL,
	"contentType" varchar(100) NOT NULL,
	"data" "bytea" NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "socials_plans" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slotKey" varchar(200) NOT NULL,
	"slotAt" timestamp NOT NULL,
	"platform" varchar(30) NOT NULL,
	"format" varchar(100) NOT NULL,
	"status" varchar(20) NOT NULL,
	"reason" text,
	"screeningIds" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"caption" text,
	"publishedAt" timestamp,
	"externalId" varchar(100),
	"permalink" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "socials_plans_slotKey_unique" UNIQUE("slotKey")
);
--> statement-breakpoint
ALTER TABLE "socials_plan_media" ADD CONSTRAINT "socials_plan_media_planId_socials_plans_id_fk" FOREIGN KEY ("planId") REFERENCES "public"."socials_plans"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "socials_plan_media_plan_idx" ON "socials_plan_media" USING btree ("planId");--> statement-breakpoint
CREATE INDEX "socials_plans_slot_at_idx" ON "socials_plans" USING btree ("slotAt");