import {
  bigint,
  date,
  float,
  int,
  mysqlTable,
  text,
  timestamp,
  varchar,
} from 'drizzle-orm/mysql-core';

export const moviesTable = mysqlTable('movies', {
  id: int().primaryKey().autoincrement(),
  sourceId: int().notNull().unique(),
  url: varchar({ length: 255 }).notNull(),
  title: varchar({ length: 255 }).notNull(),
  titleOriginal: varchar({ length: 255 }).notNull(),
  description: text().notNull(),
  productionYear: int().notNull(),
  worldPremiereDate: date(),
  polishPremiereDate: date(),
  usersRating: float(),
  usersRatingVotes: int(),
  criticsRating: float(),
  criticsRatingVotes: int(),
  language: varchar({ length: 255 }),
  duration: int().notNull(),
  posterUrl: varchar({ length: 255 }),
  backdropUrl: varchar({ length: 512 }),
  videoUrl: varchar({ length: 255 }),
  boxoffice: bigint('boxoffice', { mode: 'number' }),
  budget: bigint('budget', { mode: 'number' }),
  distribution: varchar({ length: 255 }),
  createdAt: timestamp().notNull().defaultNow(),
  updatedAt: timestamp().notNull().defaultNow(),
});

export type Movie = typeof moviesTable.$inferSelect;
export type NewMovie = typeof moviesTable.$inferInsert;
