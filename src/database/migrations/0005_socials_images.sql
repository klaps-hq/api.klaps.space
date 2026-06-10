CREATE TABLE "socials_images" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"data" "bytea" NOT NULL,
	"contentType" varchar(100) NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
