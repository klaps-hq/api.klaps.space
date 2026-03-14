import {
  boolean,
  date,
  integer,
  pgTable,
  serial,
  timestamp,
  unique,
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
    unique('socials_posts_postDate_platform_content_type_unique').on(
      table.postDate,
      table.platform,
      table.contentType,
    ),
  ],
);

export type SocialsPost = typeof socialsPostsTable.$inferSelect;
export type NewSocialsPost = typeof socialsPostsTable.$inferInsert;
