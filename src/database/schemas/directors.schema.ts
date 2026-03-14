import {
  integer,
  pgTable,
  serial,
  timestamp,
  varchar,
} from 'drizzle-orm/pg-core';

export const directorsTable = pgTable('directors', {
  id: serial().primaryKey(),
  sourceId: integer().notNull().unique(),
  name: varchar({ length: 255 }).notNull(),
  url: varchar({ length: 255 }).notNull(),
  createdAt: timestamp().notNull().defaultNow(),
  updatedAt: timestamp().notNull().defaultNow(),
});

export type Director = typeof directorsTable.$inferSelect;
export type NewDirector = typeof directorsTable.$inferInsert;
