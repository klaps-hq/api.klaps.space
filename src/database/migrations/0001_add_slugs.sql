ALTER TABLE `movies` ADD COLUMN `slug` varchar(255) AFTER `sourceId`;
--> statement-breakpoint
ALTER TABLE `cinemas` ADD COLUMN `slug` varchar(255) AFTER `sourceId`;
--> statement-breakpoint
ALTER TABLE `cities` ADD COLUMN `slug` varchar(255) AFTER `sourceId`;
--> statement-breakpoint
ALTER TABLE `genres` ADD COLUMN `slug` varchar(255) AFTER `sourceId`;
