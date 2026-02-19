-- Migration: Rename filmwebId -> sourceId, filmwebCityId -> sourceCityId
-- Date: 2026-02-19
--
-- NOTE: Run these statements in order. MySQL 8.0+ RENAME COLUMN
-- automatically propagates to foreign key constraints that reference
-- the renamed column within the same table.

-- 1. Rename columns that are referenced by foreign keys FIRST
--    (cities.filmwebId is referenced by cinemas.filmwebCityId)
ALTER TABLE `cities` RENAME COLUMN `filmwebId` TO `sourceId`;

-- 2. Rename cinemas columns (filmwebId is referenced by screenings.cinemaId FK)
ALTER TABLE `cinemas` RENAME COLUMN `filmwebId` TO `sourceId`;
ALTER TABLE `cinemas` RENAME COLUMN `filmwebCityId` TO `sourceCityId`;

-- 3. Remaining tables (no inbound FK references on filmwebId)
ALTER TABLE `movies` RENAME COLUMN `filmwebId` TO `sourceId`;
ALTER TABLE `actors` RENAME COLUMN `filmwebId` TO `sourceId`;
ALTER TABLE `directors` RENAME COLUMN `filmwebId` TO `sourceId`;
ALTER TABLE `scriptwriters` RENAME COLUMN `filmwebId` TO `sourceId`;
ALTER TABLE `genres` RENAME COLUMN `filmwebId` TO `sourceId`;
