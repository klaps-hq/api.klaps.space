import { int, mysqlTable, timestamp, varchar } from 'drizzle-orm/mysql-core';

export const genresTable = mysqlTable('genres', {
  id: int().primaryKey().autoincrement(),
  sourceId: int().notNull().unique(),
  name: varchar({ length: 255 }).notNull(),
  createdAt: timestamp().notNull().defaultNow(),
  updatedAt: timestamp().notNull().defaultNow(),
});

export type Genre = typeof genresTable.$inferSelect;
export type NewGenre = typeof genresTable.$inferInsert;
