import { pgTable, serial, timestamp, varchar } from 'drizzle-orm/pg-core';

export const countriesTable = pgTable('countries', {
  id: serial().primaryKey(),
  name: varchar({ length: 255 }).notNull(),
  countryCode: varchar({ length: 255 }).notNull().unique(),
  createdAt: timestamp().notNull().defaultNow(),
  updatedAt: timestamp().notNull().defaultNow(),
});

export type Country = typeof countriesTable.$inferSelect;
export type NewCountry = typeof countriesTable.$inferInsert;
