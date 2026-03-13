import {
  bigint,
  date,
  integer,
  pgTable,
  real,
  serial,
  text,
  timestamp,
  varchar,
} from 'drizzle-orm/pg-core';

export const moviesTable = pgTable('movies', {
  id: serial().primaryKey(),
  sourceId: integer().notNull().unique(),
  slug: varchar({ length: 255 }).notNull().unique(),
  url: varchar({ length: 255 }).notNull(),
  title: varchar({ length: 255 }).notNull(),
  titleOriginal: varchar({ length: 255 }).notNull(),
  description: text().notNull(),
  productionYear: integer().notNull(),
  worldPremiereDate: date({ mode: 'date' }),
  polishPremiereDate: date({ mode: 'date' }),
  usersRating: real(),
  usersRatingVotes: integer(),
  criticsRating: real(),
  criticsRatingVotes: integer(),
  language: varchar({ length: 255 }),
  duration: integer(),
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
