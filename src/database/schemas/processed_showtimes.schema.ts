import { int, mysqlTable, timestamp, unique } from 'drizzle-orm/mysql-core';
import { showtimesTable } from './showtimes.schema';

export const processedShowtimesTable = mysqlTable(
  'processed_showtimes',
  {
    id: int().primaryKey().autoincrement(),
    showtimeId: int()
      .notNull()
      .references(() => showtimesTable.id),
    processedAt: timestamp().notNull().defaultNow(),
  },
  (table) => [unique('processed_showtimes_showtimeId').on(table.showtimeId)],
);

export type ProcessedShowtime = typeof processedShowtimesTable.$inferSelect;
export type NewProcessedShowtime = typeof processedShowtimesTable.$inferInsert;
