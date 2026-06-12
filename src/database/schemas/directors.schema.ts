import {
  integer,
  pgTable,
  serial,
  text,
  timestamp,
  varchar,
} from 'drizzle-orm/pg-core';

export const directorsTable = pgTable('directors', {
  id: serial().primaryKey(),
  sourceId: integer().notNull().unique(),
  // Stable, frozen once assigned (see upsertDirectors): the canonical URL slug
  // never changes, so old links always resolve. Nullable only transitionally -
  // existing rows are filled by the backfill script and the app always writes it.
  slug: varchar({ length: 255 }).unique(),
  name: varchar({ length: 255 }).notNull(),
  url: varchar({ length: 255 }).notNull(),
  // Forward-looking: this iteration stores only directors, but the column lets
  // the same model serve actors/screenwriters later.
  role: varchar({ length: 50 }).notNull().default('director'),
  bio: text(),
  photoUrl: varchar({ length: 512 }),
  createdAt: timestamp().notNull().defaultNow(),
  updatedAt: timestamp().notNull().defaultNow(),
});

export type Director = typeof directorsTable.$inferSelect;
export type NewDirector = typeof directorsTable.$inferInsert;
