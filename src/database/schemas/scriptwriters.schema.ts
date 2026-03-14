import { integer, pgTable, serial, timestamp, varchar } from 'drizzle-orm/pg-core';

export const scriptwritersTable = pgTable('scriptwriters', {
  id: serial().primaryKey(),
  sourceId: integer().notNull().unique(),
  name: varchar({ length: 255 }).notNull(),
  url: varchar({ length: 255 }).notNull(),
  createdAt: timestamp().notNull().defaultNow(),
  updatedAt: timestamp().notNull().defaultNow(),
});

export type Scriptwriter = typeof scriptwritersTable.$inferSelect;
export type NewScriptwriter = typeof scriptwritersTable.$inferInsert;
