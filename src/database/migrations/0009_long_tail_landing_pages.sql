CREATE TABLE "landing_intros" (
	"key" varchar(128) PRIMARY KEY NOT NULL,
	"content" text NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "cinemas" ADD COLUMN "isOpenAir" boolean DEFAULT false NOT NULL;