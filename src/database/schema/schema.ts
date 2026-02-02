import {
  mysqlTable,
  mysqlSchema,
  AnyMySqlColumn,
  primaryKey,
  unique,
  int,
  tinyint,
  varchar,
  timestamp,
  foreignKey,
  float,
  text,
  date,
  datetime,
} from 'drizzle-orm/mysql-core';
import { sql } from 'drizzle-orm';

export const actors = mysqlTable(
  'actors',
  {
    id: int().autoincrement().notNull(),
    filmwebId: int().notNull(),
    name: varchar({ length: 255 }).notNull(),
    url: varchar({ length: 255 }).notNull(),
    createdAt: timestamp({ mode: 'string' })
      .default(sql`(now())`)
      .notNull(),
    updatedAt: timestamp({ mode: 'string' })
      .default(sql`(now())`)
      .notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.id], name: 'actors_id' }),
    unique('actors_filmwebId_unique').on(table.filmwebId),
    unique('actors_url_unique').on(table.url),
  ],
);

export const cinemas = mysqlTable(
  'cinemas',
  {
    id: int().autoincrement().notNull(),
    filmwebId: int().notNull(),
    name: varchar({ length: 255 }).notNull(),
    url: varchar({ length: 255 }).notNull(),
    filmwebCityId: int()
      .notNull()
      .references(() => cities.filmwebId),
    longitude: float(),
    latitude: float(),
    street: varchar({ length: 255 }),
    createdAt: timestamp({ mode: 'string' })
      .default(sql`(now())`)
      .notNull(),
    updatedAt: timestamp({ mode: 'string' })
      .default(sql`(now())`)
      .notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.id], name: 'cinemas_id' }),
    unique('cinemas_filmwebId_unique').on(table.filmwebId),
  ],
);

export const cities = mysqlTable(
  'cities',
  {
    id: int().autoincrement().notNull(),
    filmwebId: int().notNull(),
    name: varchar({ length: 255 }).notNull(),
    nameDeclinated: varchar({ length: 255 }).notNull(),
    areacode: int(),
  },
  (table) => [
    primaryKey({ columns: [table.id], name: 'cities_id' }),
    unique('cities_filmwebId_unique').on(table.filmwebId),
  ],
);

export const countries = mysqlTable(
  'countries',
  {
    id: int().autoincrement().notNull(),
    name: varchar({ length: 255 }).notNull(),
    countryCode: varchar({ length: 255 }).notNull(),
    createdAt: timestamp({ mode: 'string' })
      .default(sql`(now())`)
      .notNull(),
    updatedAt: timestamp({ mode: 'string' })
      .default(sql`(now())`)
      .notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.id], name: 'countries_id' }),
    unique('countries_countryCode_unique').on(table.countryCode),
  ],
);

export const directors = mysqlTable(
  'directors',
  {
    id: int().autoincrement().notNull(),
    filmwebId: int().notNull(),
    name: varchar({ length: 255 }).notNull(),
    url: varchar({ length: 255 }).notNull(),
    createdAt: timestamp({ mode: 'string' })
      .default(sql`(now())`)
      .notNull(),
    updatedAt: timestamp({ mode: 'string' })
      .default(sql`(now())`)
      .notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.id], name: 'directors_id' }),
    unique('directors_filmwebId_unique').on(table.filmwebId),
  ],
);

export const genres = mysqlTable(
  'genres',
  {
    id: int().autoincrement().notNull(),
    filmwebId: int().notNull(),
    name: varchar({ length: 255 }).notNull(),
    createdAt: timestamp({ mode: 'string' })
      .default(sql`(now())`)
      .notNull(),
    updatedAt: timestamp({ mode: 'string' })
      .default(sql`(now())`)
      .notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.id], name: 'genres_id' }),
    unique('genres_filmwebId_unique').on(table.filmwebId),
  ],
);

export const movies = mysqlTable(
  'movies',
  {
    id: int().autoincrement().notNull(),
    filmwebId: int().notNull(),
    url: varchar({ length: 255 }).notNull(),
    title: varchar({ length: 255 }).notNull(),
    titleOriginal: varchar({ length: 255 }).notNull(),
    description: text().notNull(),
    productionYear: int().notNull(),
    // you can use { mode: 'date' }, if you want to have Date as type for this column
    worldPremiereDate: date({ mode: 'string' }),
    // you can use { mode: 'date' }, if you want to have Date as type for this column
    polishPremiereDate: date({ mode: 'string' }),
    usersRating: float(),
    usersRatingVotes: int(),
    criticsRating: float(),
    criticsRatingVotes: int(),
    language: varchar({ length: 255 }).notNull(),
    duration: int().notNull(),
    posterUrl: varchar({ length: 255 }),
    videoUrl: varchar({ length: 255 }),
    createdAt: timestamp({ mode: 'string' })
      .default(sql`(now())`)
      .notNull(),
    updatedAt: timestamp({ mode: 'string' })
      .default(sql`(now())`)
      .notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.id], name: 'movies_id' }),
    unique('movies_filmwebId_unique').on(table.filmwebId),
  ],
);

export const movies_actors = mysqlTable(
  'movies_actors',
  {
    id: int().autoincrement().notNull(),
    movieId: int()
      .notNull()
      .references(() => movies.id),
    actorId: int()
      .notNull()
      .references(() => actors.id),
    createdAt: timestamp({ mode: 'string' })
      .default(sql`(now())`)
      .notNull(),
    updatedAt: timestamp({ mode: 'string' })
      .default(sql`(now())`)
      .notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.id], name: 'movies_actors_id' }),
    unique('movies_actors_movieId_actorId_unique').on(
      table.movieId,
      table.actorId,
    ),
  ],
);

export const movies_countries = mysqlTable(
  'movies_countries',
  {
    id: int().autoincrement().notNull(),
    movieId: int()
      .notNull()
      .references(() => movies.id),
    countryId: int()
      .notNull()
      .references(() => countries.id),
    createdAt: timestamp({ mode: 'string' })
      .default(sql`(now())`)
      .notNull(),
    updatedAt: timestamp({ mode: 'string' })
      .default(sql`(now())`)
      .notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.id], name: 'movies_countries_id' }),
    unique('movies_countries_movieId_countryId_unique').on(
      table.movieId,
      table.countryId,
    ),
  ],
);

export const movies_directors = mysqlTable(
  'movies_directors',
  {
    id: int().autoincrement().notNull(),
    movieId: int()
      .notNull()
      .references(() => movies.id),
    directorId: int()
      .notNull()
      .references(() => directors.id),
    createdAt: timestamp({ mode: 'string' })
      .default(sql`(now())`)
      .notNull(),
    updatedAt: timestamp({ mode: 'string' })
      .default(sql`(now())`)
      .notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.id], name: 'movies_directors_id' }),
    unique('movies_directors_movieId_directorId_unique').on(
      table.movieId,
      table.directorId,
    ),
  ],
);

export const movies_genres = mysqlTable(
  'movies_genres',
  {
    id: int().autoincrement().notNull(),
    movieId: int()
      .notNull()
      .references(() => movies.id),
    genreId: int()
      .notNull()
      .references(() => genres.id),
    createdAt: timestamp({ mode: 'string' })
      .default(sql`(now())`)
      .notNull(),
    updatedAt: timestamp({ mode: 'string' })
      .default(sql`(now())`)
      .notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.id], name: 'movies_genres_id' }),
    unique('movies_genres_movieId_genreId_unique').on(
      table.movieId,
      table.genreId,
    ),
  ],
);

export const screenings = mysqlTable(
  'screenings',
  {
    id: int().autoincrement().notNull(),
    url: varchar({ length: 255 }),
    movieId: int()
      .notNull()
      .references(() => movies.id),
    showtimeId: int()
      .notNull()
      .references(() => showtimes.id),
    cinemaId: int()
      .notNull()
      .references(() => cinemas.filmwebId),
    date: datetime({ mode: 'string' }).notNull(),
    isDubbing: tinyint().notNull(),
    isSubtitled: tinyint().notNull(),
    createdAt: timestamp({ mode: 'string' })
      .default(sql`(now())`)
      .notNull(),
    updatedAt: timestamp({ mode: 'string' })
      .default(sql`(now())`)
      .notNull(),
    type: varchar({ length: 255 }).notNull(),
  },
  (table) => [primaryKey({ columns: [table.id], name: 'screenings_id' })],
);

export const showtimes = mysqlTable(
  'showtimes',
  {
    id: int().autoincrement().notNull(),
    url: varchar({ length: 255 }).notNull(),
    cityId: int()
      .notNull()
      .references(() => cities.id),
    // you can use { mode: 'date' }, if you want to have Date as type for this column
    date: date({ mode: 'string' }).notNull(),
    createdAt: timestamp({ mode: 'string' })
      .default(sql`(now())`)
      .notNull(),
    updatedAt: timestamp({ mode: 'string' })
      .default(sql`(now())`)
      .notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.id], name: 'showtimes_id' }),
    unique('showtimes_url_unique').on(table.url),
  ],
);
