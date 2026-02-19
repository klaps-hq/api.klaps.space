import { int, mysqlTable, timestamp, varchar } from "drizzle-orm/mysql-core";

export const actorsTable = mysqlTable("actors", {
  id: int().primaryKey().autoincrement(),
  sourceId: int().notNull().unique(),
  name: varchar({ length: 255 }).notNull(),
  url: varchar({ length: 255 }).notNull().unique(),
  createdAt: timestamp().notNull().defaultNow(),
  updatedAt: timestamp().notNull().defaultNow(),
});

export type Actor = typeof actorsTable.$inferSelect;
export type NewActor = typeof actorsTable.$inferInsert;
