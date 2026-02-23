ALTER TABLE `movies` MODIFY COLUMN `slug` varchar(255) NOT NULL;
--> statement-breakpoint
ALTER TABLE `movies` ADD CONSTRAINT `movies_slug_unique` UNIQUE(`slug`);
--> statement-breakpoint
ALTER TABLE `cinemas` MODIFY COLUMN `slug` varchar(255) NOT NULL;
--> statement-breakpoint
ALTER TABLE `cinemas` ADD CONSTRAINT `cinemas_slug_unique` UNIQUE(`slug`);
--> statement-breakpoint
ALTER TABLE `cities` MODIFY COLUMN `slug` varchar(255) NOT NULL;
--> statement-breakpoint
ALTER TABLE `cities` ADD CONSTRAINT `cities_slug_unique` UNIQUE(`slug`);
--> statement-breakpoint
ALTER TABLE `genres` MODIFY COLUMN `slug` varchar(255) NOT NULL;
--> statement-breakpoint
ALTER TABLE `genres` ADD CONSTRAINT `genres_slug_unique` UNIQUE(`slug`);
