import {
  boolean,
  integer,
  pgTable,
  real,
  serial,
  text,
  timestamp,
  varchar,
} from 'drizzle-orm/pg-core';
import { citiesTable } from './cities.schema';

export const cinemasTable = pgTable('cinemas', {
  id: serial().primaryKey(),
  sourceId: integer().notNull().unique(),
  slug: varchar({ length: 255 }).notNull().unique(),
  name: varchar({ length: 255 }).notNull(),
  url: varchar({ length: 255 }).notNull(),
  sourceCityId: integer()
    .references(() => citiesTable.sourceId)
    .notNull(),
  longitude: real(),
  latitude: real(),
  street: varchar({ length: 255 }),
  description: text(),
  email: varchar({ length: 255 }),
  website: varchar({ length: 255 }),
  // Social publishing (klaps.radar): the cinema's Instagram account is tagged
  // on posts, and invited as a collaborator only when it agreed to it.
  instagramUsername: varchar({ length: 64 }),
  instagramCollab: boolean().notNull().default(false),
  // Facebook Page ID of the cinema's place, used as the post location.
  facebookPlaceId: varchar({ length: 32 }),
  // Open-air venue (summer cinema series such as TME Polówka or Filmowa
  // Stolica Lata). Set from the name when the cinema is first created and
  // never overwritten by the scraper, so manual corrections stick.
  isOpenAir: boolean().notNull().default(false),
  createdAt: timestamp().notNull().defaultNow(),
  updatedAt: timestamp().notNull().defaultNow(),
});

export type Cinema = typeof cinemasTable.$inferSelect;
export type NewCinema = typeof cinemasTable.$inferInsert;
