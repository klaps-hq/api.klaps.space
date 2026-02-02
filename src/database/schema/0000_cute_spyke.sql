-- Current sql file was generated after introspecting the database
-- If you want to run this migration please uncomment this code before executing migrations
/*
CREATE TABLE `actors` (
	`id` int AUTO_INCREMENT NOT NULL,
	`filmwebId` int NOT NULL,
	`name` varchar(255) NOT NULL,
	`url` varchar(255) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `actors_id` PRIMARY KEY(`id`),
	CONSTRAINT `actors_filmwebId_unique` UNIQUE(`filmwebId`),
	CONSTRAINT `actors_url_unique` UNIQUE(`url`)
);
--> statement-breakpoint
CREATE TABLE `cinemas` (
	`id` int AUTO_INCREMENT NOT NULL,
	`filmwebId` int NOT NULL,
	`name` varchar(255) NOT NULL,
	`url` varchar(255) NOT NULL,
	`filmwebCityId` int NOT NULL,
	`longitude` float,
	`latitude` float,
	`street` varchar(255),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `cinemas_id` PRIMARY KEY(`id`),
	CONSTRAINT `cinemas_filmwebId_unique` UNIQUE(`filmwebId`)
);
--> statement-breakpoint
CREATE TABLE `cities` (
	`id` int AUTO_INCREMENT NOT NULL,
	`filmwebId` int NOT NULL,
	`name` varchar(255) NOT NULL,
	`nameDeclinated` varchar(255) NOT NULL,
	`areacode` int,
	CONSTRAINT `cities_id` PRIMARY KEY(`id`),
	CONSTRAINT `cities_filmwebId_unique` UNIQUE(`filmwebId`)
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
	`filmwebId` int NOT NULL,
	`name` varchar(255) NOT NULL,
	`url` varchar(255) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `directors_id` PRIMARY KEY(`id`),
	CONSTRAINT `directors_filmwebId_unique` UNIQUE(`filmwebId`)
);
--> statement-breakpoint
CREATE TABLE `genres` (
	`id` int AUTO_INCREMENT NOT NULL,
	`filmwebId` int NOT NULL,
	`name` varchar(255) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `genres_id` PRIMARY KEY(`id`),
	CONSTRAINT `genres_filmwebId_unique` UNIQUE(`filmwebId`)
);
--> statement-breakpoint
CREATE TABLE `movies` (
	`id` int AUTO_INCREMENT NOT NULL,
	`filmwebId` int NOT NULL,
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
	`language` varchar(255) NOT NULL,
	`duration` int NOT NULL,
	`posterUrl` varchar(255),
	`videoUrl` varchar(255),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `movies_id` PRIMARY KEY(`id`),
	CONSTRAINT `movies_filmwebId_unique` UNIQUE(`filmwebId`)
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
CREATE TABLE `screenings` (
	`id` int AUTO_INCREMENT NOT NULL,
	`url` varchar(255),
	`movieId` int NOT NULL,
	`showtimeId` int NOT NULL,
	`cinemaId` int NOT NULL,
	`date` datetime NOT NULL,
	`isDubbing` tinyint(1) NOT NULL,
	`isSubtitled` tinyint(1) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()),
	`type` varchar(255) NOT NULL,
	CONSTRAINT `screenings_id` PRIMARY KEY(`id`)
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
ALTER TABLE `cinemas` ADD CONSTRAINT `cinemas_filmwebCityId_cities_filmwebId_fk` FOREIGN KEY (`filmwebCityId`) REFERENCES `cities`(`filmwebId`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `movies_actors` ADD CONSTRAINT `movies_actors_actorId_actors_id_fk` FOREIGN KEY (`actorId`) REFERENCES `actors`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `movies_actors` ADD CONSTRAINT `movies_actors_movieId_movies_id_fk` FOREIGN KEY (`movieId`) REFERENCES `movies`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `movies_countries` ADD CONSTRAINT `movies_countries_countryId_countries_id_fk` FOREIGN KEY (`countryId`) REFERENCES `countries`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `movies_countries` ADD CONSTRAINT `movies_countries_movieId_movies_id_fk` FOREIGN KEY (`movieId`) REFERENCES `movies`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `movies_directors` ADD CONSTRAINT `movies_directors_directorId_directors_id_fk` FOREIGN KEY (`directorId`) REFERENCES `directors`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `movies_directors` ADD CONSTRAINT `movies_directors_movieId_movies_id_fk` FOREIGN KEY (`movieId`) REFERENCES `movies`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `movies_genres` ADD CONSTRAINT `movies_genres_genreId_genres_id_fk` FOREIGN KEY (`genreId`) REFERENCES `genres`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `movies_genres` ADD CONSTRAINT `movies_genres_movieId_movies_id_fk` FOREIGN KEY (`movieId`) REFERENCES `movies`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `screenings` ADD CONSTRAINT `screenings_cinemaId_cinemas_filmwebId_fk` FOREIGN KEY (`cinemaId`) REFERENCES `cinemas`(`filmwebId`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `screenings` ADD CONSTRAINT `screenings_movieId_movies_id_fk` FOREIGN KEY (`movieId`) REFERENCES `movies`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `screenings` ADD CONSTRAINT `screenings_showtimeId_showtimes_id_fk` FOREIGN KEY (`showtimeId`) REFERENCES `showtimes`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `showtimes` ADD CONSTRAINT `showtimes_cityId_cities_id_fk` FOREIGN KEY (`cityId`) REFERENCES `cities`(`id`) ON DELETE no action ON UPDATE no action;
*/