import { int, mysqlTable, varchar } from "drizzle-orm/mysql-core";

export const citiesTable = mysqlTable("cities", {
  id: int().primaryKey().autoincrement(),
  filmwebId: int().notNull().unique(),
  name: varchar({ length: 255 }).notNull(),
  nameDeclinated: varchar({ length: 255 }).notNull(),
  areacode: int(),
});

export type City = typeof citiesTable.$inferSelect;
export type NewCity = typeof citiesTable.$inferInsert;
