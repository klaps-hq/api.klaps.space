import { int, mysqlTable, timestamp, varchar } from "drizzle-orm/mysql-core";

export const scriptwritersTable = mysqlTable("scriptwriters", {
  id: int().primaryKey().autoincrement(),
  sourceId: int().notNull().unique(),
  name: varchar({ length: 255 }).notNull(),
  url: varchar({ length: 255 }).notNull(),
  createdAt: timestamp().notNull().defaultNow(),
  updatedAt: timestamp().notNull().defaultNow(),
});

export type Scriptwriter = typeof scriptwritersTable.$inferSelect;
export type NewScriptwriter = typeof scriptwritersTable.$inferInsert;
