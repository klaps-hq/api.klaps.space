import { datetime, int, mysqlTable, text, varchar } from 'drizzle-orm/mysql-core';

export const citiesTable = mysqlTable('cities', {
  id: int().primaryKey().autoincrement(),
  sourceId: int().notNull().unique(),
  slug: varchar({ length: 255 }).notNull().unique(),
  name: varchar({ length: 255 }).notNull(),
  nameDeclinated: varchar({ length: 255 }).notNull(),
  areacode: int(),
  description: text(),
  lastScrapedAt: datetime(),
});

export type City = typeof citiesTable.$inferSelect;
export type NewCity = typeof citiesTable.$inferInsert;
