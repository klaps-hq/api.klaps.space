import { sql } from 'drizzle-orm';
import {
  boolean,
  date,
  index,
  integer,
  pgTable,
  serial,
  timestamp,
  uniqueIndex,
  varchar,
} from 'drizzle-orm/pg-core';
import { moviesTable } from './movies.schema';
import { screeningsTable } from './screenings.schema';

export const socialsPostsTable = pgTable(
  'socials_posts',
  {
    id: serial().primaryKey(),
    postDate: date({ mode: 'string' }).notNull(),
    platform: varchar({ length: 30 }).notNull().default('instagram_post'),
    contentType: varchar({ length: 30 }).notNull().default('feed_candidate'),
    movieId: integer().references(() => moviesTable.id),
    screeningId: integer().references(() => screeningsTable.id),
    score: integer().notNull(),
    published: boolean().notNull(),
    reason: varchar({ length: 100 }).notNull(),
    createdAt: timestamp().notNull().defaultNow(),
  },
  (table) => [
    // One series post per day and kind. Feed posts are limited per
    // publication day in SocialsService instead, so several slots a day
    // (e.g. two stories) may promote screenings on the same date.
    uniqueIndex('socials_posts_series_unique')
      .on(table.postDate, table.platform, table.contentType)
      .where(sql`"contentType" <> 'feed_candidate'`),
    index('socials_posts_platform_created_at_idx').on(
      table.platform,
      table.createdAt,
    ),
  ],
);

export type SocialsPost = typeof socialsPostsTable.$inferSelect;
export type NewSocialsPost = typeof socialsPostsTable.$inferInsert;
