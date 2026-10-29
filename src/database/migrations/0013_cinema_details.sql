ALTER TABLE "cinemas" ADD COLUMN "phone" varchar(32);--> statement-breakpoint
ALTER TABLE "cinemas" ADD COLUMN "repertoireUrl" varchar(512);--> statement-breakpoint
ALTER TABLE "cinemas" ADD COLUMN "bookingUrl" varchar(512);--> statement-breakpoint
ALTER TABLE "cinemas" ADD COLUMN "facebookUrl" varchar(255);--> statement-breakpoint
ALTER TABLE "cinemas" ADD COLUMN "instagramUrl" varchar(255);--> statement-breakpoint
ALTER TABLE "cinemas" ADD COLUMN "operatorName" varchar(255);--> statement-breakpoint
ALTER TABLE "cinemas" ADD COLUMN "operatorUrl" varchar(512);--> statement-breakpoint
ALTER TABLE "cinemas" ADD COLUMN "screens" smallint;--> statement-breakpoint
ALTER TABLE "cinemas" ADD COLUMN "rooms" jsonb;--> statement-breakpoint
ALTER TABLE "cinemas" ADD COLUMN "accessibility" jsonb;--> statement-breakpoint
ALTER TABLE "cinemas" ADD COLUMN "logoUrl" varchar(512);--> statement-breakpoint
ALTER TABLE "cinemas" ADD COLUMN "photos" jsonb;--> statement-breakpoint
ALTER TABLE "cinemas" ADD COLUMN "detailsUpdatedAt" timestamp;