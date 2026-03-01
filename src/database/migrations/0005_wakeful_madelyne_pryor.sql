ALTER TABLE `socials_posts` DROP INDEX `socials_posts_postDate_unique`;--> statement-breakpoint
ALTER TABLE `socials_posts` ADD `platform` varchar(30) DEFAULT 'instagram' NOT NULL;--> statement-breakpoint
ALTER TABLE `socials_posts` ADD CONSTRAINT `socials_posts_postDate_platform_unique` UNIQUE(`postDate`,`platform`);