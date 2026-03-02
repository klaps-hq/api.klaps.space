SET @has_instagram_posts := (
  SELECT COUNT(*)
  FROM information_schema.tables
  WHERE table_schema = DATABASE()
    AND table_name = 'instagram_posts'
);--> statement-breakpoint

SET @has_socials_posts := (
  SELECT COUNT(*)
  FROM information_schema.tables
  WHERE table_schema = DATABASE()
    AND table_name = 'socials_posts'
);--> statement-breakpoint

SET @rename_sql := IF(
  @has_instagram_posts = 1 AND @has_socials_posts = 0,
  'RENAME TABLE `instagram_posts` TO `socials_posts`',
  'SELECT 1'
);--> statement-breakpoint
PREPARE stmt FROM @rename_sql;--> statement-breakpoint
EXECUTE stmt;--> statement-breakpoint
DEALLOCATE PREPARE stmt;--> statement-breakpoint

SET @has_old_unique := (
  SELECT COUNT(*)
  FROM information_schema.statistics
  WHERE table_schema = DATABASE()
    AND table_name = 'socials_posts'
    AND index_name = 'instagram_posts_postDate_unique'
);--> statement-breakpoint
SET @drop_old_unique_sql := IF(
  @has_old_unique = 1,
  'ALTER TABLE `socials_posts` DROP INDEX `instagram_posts_postDate_unique`',
  'SELECT 1'
);--> statement-breakpoint
PREPARE stmt FROM @drop_old_unique_sql;--> statement-breakpoint
EXECUTE stmt;--> statement-breakpoint
DEALLOCATE PREPARE stmt;--> statement-breakpoint

SET @has_old_movie_fk := (
  SELECT COUNT(*)
  FROM information_schema.table_constraints
  WHERE constraint_schema = DATABASE()
    AND table_name = 'socials_posts'
    AND constraint_name = 'instagram_posts_movieId_movies_id_fk'
    AND constraint_type = 'FOREIGN KEY'
);--> statement-breakpoint
SET @drop_old_movie_fk_sql := IF(
  @has_old_movie_fk = 1,
  'ALTER TABLE `socials_posts` DROP FOREIGN KEY `instagram_posts_movieId_movies_id_fk`',
  'SELECT 1'
);--> statement-breakpoint
PREPARE stmt FROM @drop_old_movie_fk_sql;--> statement-breakpoint
EXECUTE stmt;--> statement-breakpoint
DEALLOCATE PREPARE stmt;--> statement-breakpoint

SET @has_old_screening_fk := (
  SELECT COUNT(*)
  FROM information_schema.table_constraints
  WHERE constraint_schema = DATABASE()
    AND table_name = 'socials_posts'
    AND constraint_name = 'instagram_posts_screeningId_screenings_id_fk'
    AND constraint_type = 'FOREIGN KEY'
);--> statement-breakpoint
SET @drop_old_screening_fk_sql := IF(
  @has_old_screening_fk = 1,
  'ALTER TABLE `socials_posts` DROP FOREIGN KEY `instagram_posts_screeningId_screenings_id_fk`',
  'SELECT 1'
);--> statement-breakpoint
PREPARE stmt FROM @drop_old_screening_fk_sql;--> statement-breakpoint
EXECUTE stmt;--> statement-breakpoint
DEALLOCATE PREPARE stmt;--> statement-breakpoint

SET @has_new_unique := (
  SELECT COUNT(*)
  FROM information_schema.table_constraints
  WHERE constraint_schema = DATABASE()
    AND table_name = 'socials_posts'
    AND constraint_name = 'socials_posts_postDate_unique'
    AND constraint_type = 'UNIQUE'
);--> statement-breakpoint
SET @add_new_unique_sql := IF(
  @has_new_unique = 0,
  'ALTER TABLE `socials_posts` ADD CONSTRAINT `socials_posts_postDate_unique` UNIQUE(`postDate`)',
  'SELECT 1'
);--> statement-breakpoint
PREPARE stmt FROM @add_new_unique_sql;--> statement-breakpoint
EXECUTE stmt;--> statement-breakpoint
DEALLOCATE PREPARE stmt;--> statement-breakpoint

SET @has_new_movie_fk := (
  SELECT COUNT(*)
  FROM information_schema.table_constraints
  WHERE constraint_schema = DATABASE()
    AND table_name = 'socials_posts'
    AND constraint_name = 'socials_posts_movieId_movies_id_fk'
    AND constraint_type = 'FOREIGN KEY'
);--> statement-breakpoint
SET @add_new_movie_fk_sql := IF(
  @has_new_movie_fk = 0,
  'ALTER TABLE `socials_posts` ADD CONSTRAINT `socials_posts_movieId_movies_id_fk` FOREIGN KEY (`movieId`) REFERENCES `movies`(`id`) ON DELETE no action ON UPDATE no action',
  'SELECT 1'
);--> statement-breakpoint
PREPARE stmt FROM @add_new_movie_fk_sql;--> statement-breakpoint
EXECUTE stmt;--> statement-breakpoint
DEALLOCATE PREPARE stmt;--> statement-breakpoint

SET @has_new_screening_fk := (
  SELECT COUNT(*)
  FROM information_schema.table_constraints
  WHERE constraint_schema = DATABASE()
    AND table_name = 'socials_posts'
    AND constraint_name = 'socials_posts_screeningId_screenings_id_fk'
    AND constraint_type = 'FOREIGN KEY'
);--> statement-breakpoint
SET @add_new_screening_fk_sql := IF(
  @has_new_screening_fk = 0,
  'ALTER TABLE `socials_posts` ADD CONSTRAINT `socials_posts_screeningId_screenings_id_fk` FOREIGN KEY (`screeningId`) REFERENCES `screenings`(`id`) ON DELETE no action ON UPDATE no action',
  'SELECT 1'
);--> statement-breakpoint
PREPARE stmt FROM @add_new_screening_fk_sql;--> statement-breakpoint
EXECUTE stmt;--> statement-breakpoint
DEALLOCATE PREPARE stmt;