ALTER TABLE "directors" ADD COLUMN "slug" varchar(255);--> statement-breakpoint
ALTER TABLE "directors" ADD COLUMN "role" varchar(50) DEFAULT 'director' NOT NULL;--> statement-breakpoint
ALTER TABLE "directors" ADD COLUMN "bio" text;--> statement-breakpoint
ALTER TABLE "directors" ADD COLUMN "photoUrl" varchar(512);--> statement-breakpoint
ALTER TABLE "directors" ADD CONSTRAINT "directors_slug_unique" UNIQUE("slug");