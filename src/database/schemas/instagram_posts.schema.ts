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

export const instagramPostsTable = mysqlTable('instagram_posts', {
  id: int().primaryKey().autoincrement(),
  postDate: date({ mode: 'string' }).notNull().unique(),
  movieId: int().references(() => moviesTable.id),
  screeningId: int().references(() => screeningsTable.id),
  score: int().notNull(),
  published: boolean().notNull(),
  reason: varchar({ length: 100 }).notNull(),
  createdAt: timestamp().notNull().defaultNow(),
});

export type InstagramPost = typeof instagramPostsTable.$inferSelect;
export type NewInstagramPost = typeof instagramPostsTable.$inferInsert;
