import {
  boolean,
  date,
  int,
  mysqlTable,
  timestamp,
  unique,
  varchar,
} from 'drizzle-orm/mysql-core';
import { moviesTable } from './movies.schema';
import { screeningsTable } from './screenings.schema';

export const socialsPostsTable = mysqlTable(
  'socials_posts',
  {
    id: int().primaryKey().autoincrement(),
    postDate: date({ mode: 'string' }).notNull(),
    platform: varchar({ length: 30 }).notNull().default('instagram'),
    contentType: varchar({ length: 30 }).notNull().default('feed_candidate'),
    movieId: int().references(() => moviesTable.id),
    screeningId: int().references(() => screeningsTable.id),
    score: int().notNull(),
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
