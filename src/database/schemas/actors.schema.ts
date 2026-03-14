import {
  integer,
  pgTable,
  serial,
  timestamp,
  varchar,
} from 'drizzle-orm/pg-core';

export const actorsTable = pgTable('actors', {
  id: serial().primaryKey(),
  sourceId: integer().notNull().unique(),
  name: varchar({ length: 255 }).notNull(),
  url: varchar({ length: 255 }).notNull().unique(),
  createdAt: timestamp().notNull().defaultNow(),
  updatedAt: timestamp().notNull().defaultNow(),
});

export type Actor = typeof actorsTable.$inferSelect;
export type NewActor = typeof actorsTable.$inferInsert;
