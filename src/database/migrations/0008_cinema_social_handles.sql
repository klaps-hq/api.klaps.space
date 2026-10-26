ALTER TABLE "cinemas" ADD COLUMN "instagramUsername" varchar(64);--> statement-breakpoint
ALTER TABLE "cinemas" ADD COLUMN "instagramCollab" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "cinemas" ADD COLUMN "facebookPlaceId" varchar(32);