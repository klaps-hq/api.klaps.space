import {
  boolean,
  date,
  int,
  mysqlTable,
  timestamp,
  varchar,
} from 'drizzle-orm/mysql-core';
import { moviesTable } from './movies.schema';
import { screeningsTable } from './screenings.schema';

export const socialsPostsTable = mysqlTable('socials_posts', {
  id: int().primaryKey().autoincrement(),
  postDate: date({ mode: 'string' }).notNull().unique(),
  movieId: int().references(() => moviesTable.id),
  screeningId: int().references(() => screeningsTable.id),
  score: int().notNull(),
  published: boolean().notNull(),
  reason: varchar({ length: 100 }).notNull(),
  createdAt: timestamp().notNull().defaultNow(),
});

export type SocialsPost = typeof socialsPostsTable.$inferSelect;
export type NewSocialsPost = typeof socialsPostsTable.$inferInsert;
