import {
  date,
  int,
  mysqlTable,
  timestamp,
  unique,
} from 'drizzle-orm/mysql-core';
import { citiesTable } from './cities.schema';

export const processedCitiesTable = mysqlTable(
  'processed_cities',
  {
    id: int().primaryKey().autoincrement(),
    cityId: int()
      .notNull()
      .references(() => citiesTable.id),
    processedAt: date({ mode: 'string' }).notNull(),
    createdAt: timestamp().notNull().defaultNow(),
  },
  (table) => [
    unique('processed_cities_cityId_processedAt').on(
      table.cityId,
      table.processedAt,
    ),
  ],
);

export type ProcessedCity = typeof processedCitiesTable.$inferSelect;
export type NewProcessedCity = typeof processedCitiesTable.$inferInsert;
