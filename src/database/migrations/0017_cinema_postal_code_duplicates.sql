ALTER TABLE "cinemas" ADD COLUMN "streetLocked" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "cinemas" ADD COLUMN "postalCode" varchar(6);--> statement-breakpoint
ALTER TABLE "cinemas" ADD COLUMN "duplicateOfId" integer;--> statement-breakpoint
ALTER TABLE "cinemas" ADD CONSTRAINT "cinemas_duplicateOfId_cinemas_id_fk" FOREIGN KEY ("duplicateOfId") REFERENCES "public"."cinemas"("id") ON DELETE set null ON UPDATE no action;