CREATE TABLE `instagram_posts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`postDate` date NOT NULL,
	`movieId` int,
	`screeningId` int,
	`score` int NOT NULL,
	`published` boolean NOT NULL,
	`reason` varchar(100) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `instagram_posts_id` PRIMARY KEY(`id`),
	CONSTRAINT `instagram_posts_postDate_unique` UNIQUE(`postDate`)
);
--> statement-breakpoint
ALTER TABLE `instagram_posts` ADD CONSTRAINT `instagram_posts_movieId_movies_id_fk` FOREIGN KEY (`movieId`) REFERENCES `movies`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `instagram_posts` ADD CONSTRAINT `instagram_posts_screeningId_screenings_id_fk` FOREIGN KEY (`screeningId`) REFERENCES `screenings`(`id`) ON DELETE no action ON UPDATE no action;
