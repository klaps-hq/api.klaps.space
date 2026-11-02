import {
  type AnyPgColumn,
  boolean,
  integer,
  jsonb,
  pgTable,
  real,
  serial,
  smallint,
  text,
  timestamp,
  varchar,
} from 'drizzle-orm/pg-core';
import { citiesTable } from './cities.schema';

export type CinemaRoom = {
  name: string;
  seats: number | null;
};

export type CinemaAccessibility = {
  wheelchair: boolean | null;
  hearingLoop: boolean | null;
  note: string | null;
};

export type CinemaPhoto = {
  /** Image URL (Commons thumbnail or our mirror). */
  url: string;
  /** Commons file page or the cinema page the photo was taken from. */
  sourceUrl: string;
  author: string;
  /** Missing on rows imported before website photos existed: Commons. */
  source?: 'commons' | 'website';
  /** Null for website photos, which carry no free licence. */
  license: string | null;
  licenseUrl: string | null;
};

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
  // Set when `street` was corrected by hand: the scraper upsert then keeps
  // the stored value instead of the one from the source.
  streetLocked: boolean().notNull().default(false),
  // Polish postal code ("38-400"). The source does not provide one, so it is
  // filled by scripts only and the scraper upsert never touches it.
  postalCode: varchar({ length: 6 }),
  // Operator/venue duplicates: the source sometimes lists the same place
  // twice (once under the operator, once under the venue name). The extra
  // row points at the canonical cinema and is left out of city lists,
  // counts, search and the sitemap. Never touched by the scraper upsert.
  duplicateOfId: integer().references((): AnyPgColumn => cinemasTable.id, {
    onDelete: 'set null',
  }),
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
  // Venue details researched from the cinema's own pages (scripts, not the
  // scraper). The scraper upsert never touches these columns, so they stay
  // until the next research pass.
  phone: varchar({ length: 32 }),
  repertoireUrl: varchar({ length: 512 }),
  bookingUrl: varchar({ length: 512 }),
  facebookUrl: varchar({ length: 255 }),
  // Display link only. Separate from instagramUsername, which drives tagging
  // in klaps.radar and must stay opt-in.
  instagramUrl: varchar({ length: 255 }),
  operatorName: varchar({ length: 255 }),
  operatorUrl: varchar({ length: 512 }),
  screens: smallint(),
  rooms: jsonb().$type<CinemaRoom[]>(),
  accessibility: jsonb().$type<CinemaAccessibility>(),
  // Mirrored to our media bucket; never hotlinked from the cinema's site.
  logoUrl: varchar({ length: 512 }),
  // Commons photos (with licence) and photos from the cinema's own website,
  // always with the author and a link to the source.
  photos: jsonb().$type<CinemaPhoto[]>(),
  detailsUpdatedAt: timestamp(),
  createdAt: timestamp().notNull().defaultNow(),
  updatedAt: timestamp().notNull().defaultNow(),
});

export type Cinema = typeof cinemasTable.$inferSelect;
export type NewCinema = typeof cinemasTable.$inferInsert;
