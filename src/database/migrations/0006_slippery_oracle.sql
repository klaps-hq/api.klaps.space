ALTER TABLE `socials_posts` DROP INDEX `socials_posts_postDate_platform_unique`;--> statement-breakpoint
ALTER TABLE `socials_posts` ADD `contentType` varchar(30) DEFAULT 'feed_candidate' NOT NULL;--> statement-breakpoint
ALTER TABLE `socials_posts` ADD CONSTRAINT `socials_posts_postDate_platform_content_type_unique` UNIQUE(`postDate`,`platform`,`contentType`);