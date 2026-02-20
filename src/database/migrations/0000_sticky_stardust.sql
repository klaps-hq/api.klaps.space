CREATE TABLE `actors` (
	`id` int AUTO_INCREMENT NOT NULL,
	`sourceId` int NOT NULL,
	`name` varchar(255) NOT NULL,
	`url` varchar(255) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `actors_id` PRIMARY KEY(`id`),
	CONSTRAINT `actors_sourceId_unique` UNIQUE(`sourceId`),
	CONSTRAINT `actors_url_unique` UNIQUE(`url`)
);
--> statement-breakpoint
CREATE TABLE `cinemas` (
	`id` int AUTO_INCREMENT NOT NULL,
	`sourceId` int NOT NULL,
	`name` varchar(255) NOT NULL,
	`url` varchar(255) NOT NULL,
	`sourceCityId` int NOT NULL,
	`longitude` float,
	`latitude` float,
	`street` varchar(255),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `cinemas_id` PRIMARY KEY(`id`),
	CONSTRAINT `cinemas_sourceId_unique` UNIQUE(`sourceId`)
);
--> statement-breakpoint
CREATE TABLE `cities` (
	`id` int AUTO_INCREMENT NOT NULL,
	`sourceId` int NOT NULL,
	`name` varchar(255) NOT NULL,
	`nameDeclinated` varchar(255) NOT NULL,
	`areacode` int,
	CONSTRAINT `cities_id` PRIMARY KEY(`id`),
	CONSTRAINT `cities_sourceId_unique` UNIQUE(`sourceId`)
);
--> statement-breakpoint
CREATE TABLE `countries` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`countryCode` varchar(255) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `countries_id` PRIMARY KEY(`id`),
	CONSTRAINT `countries_countryCode_unique` UNIQUE(`countryCode`)
);
--> statement-breakpoint
CREATE TABLE `directors` (
	`id` int AUTO_INCREMENT NOT NULL,
	`sourceId` int NOT NULL,
	`name` varchar(255) NOT NULL,
	`url` varchar(255) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `directors_id` PRIMARY KEY(`id`),
	CONSTRAINT `directors_sourceId_unique` UNIQUE(`sourceId`)
);
--> statement-breakpoint
CREATE TABLE `genres` (
	`id` int AUTO_INCREMENT NOT NULL,
	`sourceId` int NOT NULL,
	`name` varchar(255) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `genres_id` PRIMARY KEY(`id`),
	CONSTRAINT `genres_sourceId_unique` UNIQUE(`sourceId`)
);
--> statement-breakpoint
CREATE TABLE `movies` (
	`id` int AUTO_INCREMENT NOT NULL,
	`sourceId` int NOT NULL,
	`url` varchar(255) NOT NULL,
	`title` varchar(255) NOT NULL,
	`titleOriginal` varchar(255) NOT NULL,
	`description` text NOT NULL,
	`productionYear` int NOT NULL,
	`worldPremiereDate` date,
	`polishPremiereDate` date,
	`usersRating` float,
	`usersRatingVotes` int,
	`criticsRating` float,
	`criticsRatingVotes` int,
	`language` varchar(255),
	`duration` int NOT NULL,
	`posterUrl` varchar(255),
	`backdropUrl` varchar(512),
	`videoUrl` varchar(255),
	`boxoffice` bigint,
	`budget` bigint,
	`distribution` varchar(255),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `movies_id` PRIMARY KEY(`id`),
	CONSTRAINT `movies_sourceId_unique` UNIQUE(`sourceId`)
);
--> statement-breakpoint
CREATE TABLE `movies_actors` (
	`id` int AUTO_INCREMENT NOT NULL,
	`movieId` int NOT NULL,
	`actorId` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `movies_actors_id` PRIMARY KEY(`id`),
	CONSTRAINT `movies_actors_movieId_actorId_unique` UNIQUE(`movieId`,`actorId`)
);
--> statement-breakpoint
CREATE TABLE `movies_countries` (
	`id` int AUTO_INCREMENT NOT NULL,
	`movieId` int NOT NULL,
	`countryId` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `movies_countries_id` PRIMARY KEY(`id`),
	CONSTRAINT `movies_countries_movieId_countryId_unique` UNIQUE(`movieId`,`countryId`)
);
--> statement-breakpoint
CREATE TABLE `movies_directors` (
	`id` int AUTO_INCREMENT NOT NULL,
	`movieId` int NOT NULL,
	`directorId` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `movies_directors_id` PRIMARY KEY(`id`),
	CONSTRAINT `movies_directors_movieId_directorId_unique` UNIQUE(`movieId`,`directorId`)
);
--> statement-breakpoint
CREATE TABLE `movies_genres` (
	`id` int AUTO_INCREMENT NOT NULL,
	`movieId` int NOT NULL,
	`genreId` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `movies_genres_id` PRIMARY KEY(`id`),
	CONSTRAINT `movies_genres_movieId_genreId_unique` UNIQUE(`movieId`,`genreId`)
);
--> statement-breakpoint
CREATE TABLE `movies_scriptwriters` (
	`id` int AUTO_INCREMENT NOT NULL,
	`movieId` int NOT NULL,
	`scriptwriterId` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `movies_scriptwriters_id` PRIMARY KEY(`id`),
	CONSTRAINT `movies_scriptwriters_movieId_scriptwriterId_unique` UNIQUE(`movieId`,`scriptwriterId`)
);
--> statement-breakpoint
CREATE TABLE `processed_cities` (
	`id` int AUTO_INCREMENT NOT NULL,
	`cityId` int NOT NULL,
	`processedAt` date NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `processed_cities_id` PRIMARY KEY(`id`),
	CONSTRAINT `processed_cities_cityId_processedAt` UNIQUE(`cityId`,`processedAt`)
);
--> statement-breakpoint
CREATE TABLE `processed_showtimes` (
	`id` int AUTO_INCREMENT NOT NULL,
	`showtimeId` int NOT NULL,
	`processedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `processed_showtimes_id` PRIMARY KEY(`id`),
	CONSTRAINT `processed_showtimes_showtimeId` UNIQUE(`showtimeId`)
);
--> statement-breakpoint
CREATE TABLE `screenings` (
	`id` int AUTO_INCREMENT NOT NULL,
	`url` varchar(255),
	`movieId` int NOT NULL,
	`showtimeId` int NOT NULL,
	`cinemaId` int NOT NULL,
	`type` varchar(255) NOT NULL,
	`date` datetime NOT NULL,
	`isDubbing` boolean NOT NULL,
	`isSubtitled` boolean NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `screenings_id` PRIMARY KEY(`id`),
	CONSTRAINT `screenings_unique` UNIQUE(`movieId`,`cinemaId`,`date`,`type`,`isDubbing`,`isSubtitled`)
);
--> statement-breakpoint
CREATE TABLE `scriptwriters` (
	`id` int AUTO_INCREMENT NOT NULL,
	`sourceId` int NOT NULL,
	`name` varchar(255) NOT NULL,
	`url` varchar(255) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `scriptwriters_id` PRIMARY KEY(`id`),
	CONSTRAINT `scriptwriters_sourceId_unique` UNIQUE(`sourceId`)
);
--> statement-breakpoint
CREATE TABLE `showtimes` (
	`id` int AUTO_INCREMENT NOT NULL,
	`url` varchar(255) NOT NULL,
	`cityId` int NOT NULL,
	`date` date NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `showtimes_id` PRIMARY KEY(`id`),
	CONSTRAINT `showtimes_url_unique` UNIQUE(`url`)
);
--> statement-breakpoint
ALTER TABLE `cinemas` ADD CONSTRAINT `cinemas_sourceCityId_cities_sourceId_fk` FOREIGN KEY (`sourceCityId`) REFERENCES `cities`(`sourceId`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `movies_actors` ADD CONSTRAINT `movies_actors_movieId_movies_id_fk` FOREIGN KEY (`movieId`) REFERENCES `movies`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `movies_actors` ADD CONSTRAINT `movies_actors_actorId_actors_id_fk` FOREIGN KEY (`actorId`) REFERENCES `actors`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `movies_countries` ADD CONSTRAINT `movies_countries_movieId_movies_id_fk` FOREIGN KEY (`movieId`) REFERENCES `movies`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `movies_countries` ADD CONSTRAINT `movies_countries_countryId_countries_id_fk` FOREIGN KEY (`countryId`) REFERENCES `countries`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `movies_directors` ADD CONSTRAINT `movies_directors_movieId_movies_id_fk` FOREIGN KEY (`movieId`) REFERENCES `movies`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `movies_directors` ADD CONSTRAINT `movies_directors_directorId_directors_id_fk` FOREIGN KEY (`directorId`) REFERENCES `directors`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `movies_genres` ADD CONSTRAINT `movies_genres_movieId_movies_id_fk` FOREIGN KEY (`movieId`) REFERENCES `movies`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `movies_genres` ADD CONSTRAINT `movies_genres_genreId_genres_id_fk` FOREIGN KEY (`genreId`) REFERENCES `genres`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `movies_scriptwriters` ADD CONSTRAINT `movies_scriptwriters_movieId_movies_id_fk` FOREIGN KEY (`movieId`) REFERENCES `movies`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `movies_scriptwriters` ADD CONSTRAINT `movies_scriptwriters_scriptwriterId_scriptwriters_id_fk` FOREIGN KEY (`scriptwriterId`) REFERENCES `scriptwriters`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `processed_cities` ADD CONSTRAINT `processed_cities_cityId_cities_id_fk` FOREIGN KEY (`cityId`) REFERENCES `cities`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `processed_showtimes` ADD CONSTRAINT `processed_showtimes_showtimeId_showtimes_id_fk` FOREIGN KEY (`showtimeId`) REFERENCES `showtimes`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `screenings` ADD CONSTRAINT `screenings_movieId_movies_id_fk` FOREIGN KEY (`movieId`) REFERENCES `movies`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `screenings` ADD CONSTRAINT `screenings_showtimeId_showtimes_id_fk` FOREIGN KEY (`showtimeId`) REFERENCES `showtimes`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `screenings` ADD CONSTRAINT `screenings_cinemaId_cinemas_sourceId_fk` FOREIGN KEY (`cinemaId`) REFERENCES `cinemas`(`sourceId`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `showtimes` ADD CONSTRAINT `showtimes_cityId_cities_id_fk` FOREIGN KEY (`cityId`) REFERENCES `cities`(`id`) ON DELETE no action ON UPDATE no action;