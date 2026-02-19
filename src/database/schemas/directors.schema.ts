import { int, mysqlTable, timestamp, varchar } from "drizzle-orm/mysql-core";

export const directorsTable = mysqlTable("directors", {
  id: int().primaryKey().autoincrement(),
  sourceId: int().notNull().unique(),
  name: varchar({ length: 255 }).notNull(),
  url: varchar({ length: 255 }).notNull(),
  createdAt: timestamp().notNull().defaultNow(),
  updatedAt: timestamp().notNull().defaultNow(),
});

export type Director = typeof directorsTable.$inferSelect;
export type NewDirector = typeof directorsTable.$inferInsert;
