import { int, mysqlTable, timestamp, varchar } from 'drizzle-orm/mysql-core';

export const countriesTable = mysqlTable('countries', {
  id: int().primaryKey().autoincrement(),
  name: varchar({ length: 255 }).notNull(),
  countryCode: varchar({ length: 255 }).notNull().unique(),
  createdAt: timestamp().notNull().defaultNow(),
  updatedAt: timestamp().notNull().defaultNow(),
});

export type Country = typeof countriesTable.$inferSelect;
export type NewCountry = typeof countriesTable.$inferInsert;
