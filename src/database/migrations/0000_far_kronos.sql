CREATE TABLE "actors" (
	"id" serial PRIMARY KEY NOT NULL,
	"sourceId" integer NOT NULL,
	"name" varchar(255) NOT NULL,
	"url" varchar(255) NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "actors_sourceId_unique" UNIQUE("sourceId"),
	CONSTRAINT "actors_url_unique" UNIQUE("url")
);
--> statement-breakpoint
CREATE TABLE "cinemas" (
	"id" serial PRIMARY KEY NOT NULL,
	"sourceId" integer NOT NULL,
	"slug" varchar(255) NOT NULL,
	"name" varchar(255) NOT NULL,
	"url" varchar(255) NOT NULL,
	"sourceCityId" integer NOT NULL,
	"longitude" real,
	"latitude" real,
	"street" varchar(255),
	"description" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "cinemas_sourceId_unique" UNIQUE("sourceId"),
	CONSTRAINT "cinemas_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "cities" (
	"id" serial PRIMARY KEY NOT NULL,
	"sourceId" integer NOT NULL,
	"slug" varchar(255) NOT NULL,
	"name" varchar(255) NOT NULL,
	"nameDeclinated" varchar(255) NOT NULL,
	"areacode" integer,
	"description" text,
	"lastScrapedAt" timestamp,
	CONSTRAINT "cities_sourceId_unique" UNIQUE("sourceId"),
	CONSTRAINT "cities_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "countries" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL,
	"countryCode" varchar(255) NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "countries_countryCode_unique" UNIQUE("countryCode")
);
--> statement-breakpoint
CREATE TABLE "directors" (
	"id" serial PRIMARY KEY NOT NULL,
	"sourceId" integer NOT NULL,
	"name" varchar(255) NOT NULL,
	"url" varchar(255) NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "directors_sourceId_unique" UNIQUE("sourceId")
);
--> statement-breakpoint
CREATE TABLE "genres" (
	"id" serial PRIMARY KEY NOT NULL,
	"sourceId" integer NOT NULL,
	"slug" varchar(255) NOT NULL,
	"name" varchar(255) NOT NULL,
	"description" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "genres_sourceId_unique" UNIQUE("sourceId"),
	CONSTRAINT "genres_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "movies" (
	"id" serial PRIMARY KEY NOT NULL,
	"sourceId" integer NOT NULL,
	"slug" varchar(255) NOT NULL,
	"url" varchar(255) NOT NULL,
	"title" varchar(255) NOT NULL,
	"titleOriginal" varchar(255) NOT NULL,
	"description" text NOT NULL,
	"productionYear" integer NOT NULL,
	"worldPremiereDate" date,
	"polishPremiereDate" date,
	"usersRating" real,
	"usersRatingVotes" integer,
	"criticsRating" real,
	"criticsRatingVotes" integer,
	"language" varchar(255),
	"duration" integer NOT NULL,
	"posterUrl" varchar(255),
	"backdropUrl" varchar(512),
	"videoUrl" varchar(255),
	"boxoffice" bigint,
	"budget" bigint,
	"distribution" varchar(255),
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "movies_sourceId_unique" UNIQUE("sourceId"),
	CONSTRAINT "movies_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "movies_actors" (
	"id" serial PRIMARY KEY NOT NULL,
	"movieId" integer NOT NULL,
	"actorId" integer NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "movies_actors_movieId_actorId_unique" UNIQUE("movieId","actorId")
);
--> statement-breakpoint
CREATE TABLE "movies_countries" (
	"id" serial PRIMARY KEY NOT NULL,
	"movieId" integer NOT NULL,
	"countryId" integer NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "movies_countries_movieId_countryId_unique" UNIQUE("movieId","countryId")
);
--> statement-breakpoint
CREATE TABLE "movies_directors" (
	"id" serial PRIMARY KEY NOT NULL,
	"movieId" integer NOT NULL,
	"directorId" integer NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "movies_directors_movieId_directorId_unique" UNIQUE("movieId","directorId")
);
--> statement-breakpoint
CREATE TABLE "movies_genres" (
	"id" serial PRIMARY KEY NOT NULL,
	"movieId" integer NOT NULL,
	"genreId" integer NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "movies_genres_movieId_genreId_unique" UNIQUE("movieId","genreId")
);
--> statement-breakpoint
CREATE TABLE "movies_scriptwriters" (
	"id" serial PRIMARY KEY NOT NULL,
	"movieId" integer NOT NULL,
	"scriptwriterId" integer NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "movies_scriptwriters_movieId_scriptwriterId_unique" UNIQUE("movieId","scriptwriterId")
);
--> statement-breakpoint
CREATE TABLE "screenings" (
	"id" serial PRIMARY KEY NOT NULL,
	"url" varchar(255),
	"movieId" integer NOT NULL,
	"showtimeId" integer NOT NULL,
	"cinemaId" integer NOT NULL,
	"type" varchar(255) NOT NULL,
	"date" timestamp NOT NULL,
	"isDubbing" boolean NOT NULL,
	"isSubtitled" boolean NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "screenings_unique" UNIQUE("movieId","cinemaId","date","type","isDubbing","isSubtitled")
);
--> statement-breakpoint
CREATE TABLE "scriptwriters" (
	"id" serial PRIMARY KEY NOT NULL,
	"sourceId" integer NOT NULL,
	"name" varchar(255) NOT NULL,
	"url" varchar(255) NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "scriptwriters_sourceId_unique" UNIQUE("sourceId")
);
--> statement-breakpoint
CREATE TABLE "showtimes" (
	"id" serial PRIMARY KEY NOT NULL,
	"url" varchar(255) NOT NULL,
	"cityId" integer NOT NULL,
	"date" date NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "showtimes_url_unique" UNIQUE("url")
);
--> statement-breakpoint
CREATE TABLE "socials_posts" (
	"id" serial PRIMARY KEY NOT NULL,
	"postDate" date NOT NULL,
	"platform" varchar(30) DEFAULT 'instagram_post' NOT NULL,
	"contentType" varchar(30) DEFAULT 'feed_candidate' NOT NULL,
	"movieId" integer,
	"screeningId" integer,
	"score" integer NOT NULL,
	"published" boolean NOT NULL,
	"reason" varchar(100) NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "socials_posts_postDate_platform_content_type_unique" UNIQUE("postDate","platform","contentType")
);
--> statement-breakpoint
ALTER TABLE "cinemas" ADD CONSTRAINT "cinemas_sourceCityId_cities_sourceId_fk" FOREIGN KEY ("sourceCityId") REFERENCES "public"."cities"("sourceId") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "movies_actors" ADD CONSTRAINT "movies_actors_movieId_movies_id_fk" FOREIGN KEY ("movieId") REFERENCES "public"."movies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "movies_actors" ADD CONSTRAINT "movies_actors_actorId_actors_id_fk" FOREIGN KEY ("actorId") REFERENCES "public"."actors"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "movies_countries" ADD CONSTRAINT "movies_countries_movieId_movies_id_fk" FOREIGN KEY ("movieId") REFERENCES "public"."movies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "movies_countries" ADD CONSTRAINT "movies_countries_countryId_countries_id_fk" FOREIGN KEY ("countryId") REFERENCES "public"."countries"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "movies_directors" ADD CONSTRAINT "movies_directors_movieId_movies_id_fk" FOREIGN KEY ("movieId") REFERENCES "public"."movies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "movies_directors" ADD CONSTRAINT "movies_directors_directorId_directors_id_fk" FOREIGN KEY ("directorId") REFERENCES "public"."directors"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "movies_genres" ADD CONSTRAINT "movies_genres_movieId_movies_id_fk" FOREIGN KEY ("movieId") REFERENCES "public"."movies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "movies_genres" ADD CONSTRAINT "movies_genres_genreId_genres_id_fk" FOREIGN KEY ("genreId") REFERENCES "public"."genres"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "movies_scriptwriters" ADD CONSTRAINT "movies_scriptwriters_movieId_movies_id_fk" FOREIGN KEY ("movieId") REFERENCES "public"."movies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "movies_scriptwriters" ADD CONSTRAINT "movies_scriptwriters_scriptwriterId_scriptwriters_id_fk" FOREIGN KEY ("scriptwriterId") REFERENCES "public"."scriptwriters"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "screenings" ADD CONSTRAINT "screenings_movieId_movies_id_fk" FOREIGN KEY ("movieId") REFERENCES "public"."movies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "screenings" ADD CONSTRAINT "screenings_showtimeId_showtimes_id_fk" FOREIGN KEY ("showtimeId") REFERENCES "public"."showtimes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "screenings" ADD CONSTRAINT "screenings_cinemaId_cinemas_sourceId_fk" FOREIGN KEY ("cinemaId") REFERENCES "public"."cinemas"("sourceId") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "showtimes" ADD CONSTRAINT "showtimes_cityId_cities_id_fk" FOREIGN KEY ("cityId") REFERENCES "public"."cities"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "socials_posts" ADD CONSTRAINT "socials_posts_movieId_movies_id_fk" FOREIGN KEY ("movieId") REFERENCES "public"."movies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "socials_posts" ADD CONSTRAINT "socials_posts_screeningId_screenings_id_fk" FOREIGN KEY ("screeningId") REFERENCES "public"."screenings"("id") ON DELETE no action ON UPDATE no action;