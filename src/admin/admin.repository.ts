import { Inject, Injectable } from '@nestjs/common';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import type { PgTable } from 'drizzle-orm/pg-core';
import { eq, inArray, or, sql, type SQL } from 'drizzle-orm';
import * as schema from '../database/schemas';
import * as relations from '../database/schemas/relations';
import { DRIZZLE } from '../database/constants';
import type { DeletePreview } from './admin.types';

type FullSchema = typeof schema & typeof relations;
type Db = NodePgDatabase<FullSchema>;
type Tx = Parameters<Parameters<Db['transaction']>[0]>[0];

/** Naglowek rekordu uzyty w podgladzie i komunikatach. */
interface EntityHead {
  name: string;
}

/**
 * Scentralizowana, transakcyjna logika kaskadowego usuwania encji panelu wraz
 * z podgladem zaleznosci. Trzymana w jednym miejscu, bo operacje sa niszczace
 * i przechodza przez wiele tabel.
 */
@Injectable()
export class AdminRepository {
  constructor(
    @Inject(DRIZZLE)
    private readonly db: Db,
  ) {}

  private async countWhere(
    table: PgTable,
    where: SQL | undefined,
  ): Promise<number> {
    const [row] = await this.db
      .select({ c: sql<number>`count(*)`.mapWith(Number) })
      .from(table)
      .where(where);
    return row?.c ?? 0;
  }

  // === GENRES ===

  async previewGenre(slug: string): Promise<DeletePreview | null> {
    const genre = await this.db.query.genres.findFirst({
      where: eq(schema.genres.slug, slug),
      columns: { id: true, name: true },
    });
    if (!genre) return null;

    const movieLinks = await this.countWhere(
      schema.movies_genres,
      eq(schema.movies_genres.genreId, genre.id),
    );
    return {
      entity: 'genres',
      slug,
      name: genre.name,
      dependents: [{ label: 'powiazania z filmami', count: movieLinks }],
    };
  }

  async deleteGenre(slug: string): Promise<EntityHead | null> {
    const genre = await this.db.query.genres.findFirst({
      where: eq(schema.genres.slug, slug),
      columns: { id: true, name: true },
    });
    if (!genre) return null;

    await this.db.transaction(async (tx) => {
      await tx
        .delete(schema.movies_genres)
        .where(eq(schema.movies_genres.genreId, genre.id));
      await tx.delete(schema.genres).where(eq(schema.genres.id, genre.id));
    });
    return { name: genre.name };
  }

  // === DIRECTORS ===

  async previewDirector(slug: string): Promise<DeletePreview | null> {
    const director = await this.db.query.directors.findFirst({
      where: eq(schema.directors.slug, slug),
      columns: { id: true, name: true },
    });
    if (!director) return null;

    const movieLinks = await this.countWhere(
      schema.movies_directors,
      eq(schema.movies_directors.directorId, director.id),
    );
    return {
      entity: 'directors',
      slug,
      name: director.name,
      dependents: [{ label: 'powiazania z filmami', count: movieLinks }],
    };
  }

  async deleteDirector(slug: string): Promise<EntityHead | null> {
    const director = await this.db.query.directors.findFirst({
      where: eq(schema.directors.slug, slug),
      columns: { id: true, name: true },
    });
    if (!director) return null;

    await this.db.transaction(async (tx) => {
      await tx
        .delete(schema.movies_directors)
        .where(eq(schema.movies_directors.directorId, director.id));
      await tx
        .delete(schema.directors)
        .where(eq(schema.directors.id, director.id));
    });
    return { name: director.name };
  }

  // === CINEMAS ===

  async previewCinema(slug: string): Promise<DeletePreview | null> {
    const cinema = await this.db.query.cinemas.findFirst({
      where: eq(schema.cinemas.slug, slug),
      columns: { sourceId: true, name: true },
    });
    if (!cinema) return null;

    const screenings = await this.countWhere(
      schema.screenings,
      eq(schema.screenings.cinemaId, cinema.sourceId),
    );
    return {
      entity: 'cinemas',
      slug,
      name: cinema.name,
      dependents: [{ label: 'seanse', count: screenings }],
    };
  }

  async deleteCinema(slug: string): Promise<EntityHead | null> {
    const cinema = await this.db.query.cinemas.findFirst({
      where: eq(schema.cinemas.slug, slug),
      columns: { id: true, sourceId: true, name: true },
    });
    if (!cinema) return null;

    await this.db.transaction(async (tx) => {
      const rows = await tx
        .select({ id: schema.screenings.id })
        .from(schema.screenings)
        .where(eq(schema.screenings.cinemaId, cinema.sourceId));
      await this.deleteScreeningsAndPosts(
        tx,
        rows.map((r) => r.id),
      );
      await tx.delete(schema.cinemas).where(eq(schema.cinemas.id, cinema.id));
    });
    return { name: cinema.name };
  }

  // === MOVIES ===

  async previewMovie(slug: string): Promise<DeletePreview | null> {
    const movie = await this.db.query.movies.findFirst({
      where: eq(schema.movies.slug, slug),
      columns: { id: true, title: true },
    });
    if (!movie) return null;

    const [screenings, genres, directors, actors, scriptwriters, countries] =
      await Promise.all([
        this.countWhere(
          schema.screenings,
          eq(schema.screenings.movieId, movie.id),
        ),
        this.countWhere(
          schema.movies_genres,
          eq(schema.movies_genres.movieId, movie.id),
        ),
        this.countWhere(
          schema.movies_directors,
          eq(schema.movies_directors.movieId, movie.id),
        ),
        this.countWhere(
          schema.movies_actors,
          eq(schema.movies_actors.movieId, movie.id),
        ),
        this.countWhere(
          schema.movies_scriptwriters,
          eq(schema.movies_scriptwriters.movieId, movie.id),
        ),
        this.countWhere(
          schema.movies_countries,
          eq(schema.movies_countries.movieId, movie.id),
        ),
      ]);

    return {
      entity: 'movies',
      slug,
      name: movie.title,
      dependents: [
        { label: 'seanse', count: screenings },
        {
          label: 'powiazania (gatunki/obsada/kraje)',
          count: genres + directors + actors + scriptwriters + countries,
        },
      ],
    };
  }

  async deleteMovie(slug: string): Promise<EntityHead | null> {
    const movie = await this.db.query.movies.findFirst({
      where: eq(schema.movies.slug, slug),
      columns: { id: true, title: true },
    });
    if (!movie) return null;

    await this.db.transaction(async (tx) => {
      const rows = await tx
        .select({ id: schema.screenings.id })
        .from(schema.screenings)
        .where(eq(schema.screenings.movieId, movie.id));
      const screeningIds = rows.map((r) => r.id);

      // socials_posts moga wskazywac film bezposrednio lub przez jego seans.
      await tx
        .delete(schema.socials_posts)
        .where(this.postsForMovieOrScreenings(movie.id, screeningIds));
      await tx
        .delete(schema.screenings)
        .where(eq(schema.screenings.movieId, movie.id));
      await tx
        .delete(schema.movies_genres)
        .where(eq(schema.movies_genres.movieId, movie.id));
      await tx
        .delete(schema.movies_directors)
        .where(eq(schema.movies_directors.movieId, movie.id));
      await tx
        .delete(schema.movies_actors)
        .where(eq(schema.movies_actors.movieId, movie.id));
      await tx
        .delete(schema.movies_scriptwriters)
        .where(eq(schema.movies_scriptwriters.movieId, movie.id));
      await tx
        .delete(schema.movies_countries)
        .where(eq(schema.movies_countries.movieId, movie.id));
      await tx.delete(schema.movies).where(eq(schema.movies.id, movie.id));
    });
    return { name: movie.title };
  }

  // === CITIES ===

  async previewCity(slug: string): Promise<DeletePreview | null> {
    const city = await this.db.query.cities.findFirst({
      where: eq(schema.cities.slug, slug),
      columns: { id: true, sourceId: true, name: true },
    });
    if (!city) return null;

    const cinemaRows = await this.db
      .select({ sourceId: schema.cinemas.sourceId })
      .from(schema.cinemas)
      .where(eq(schema.cinemas.sourceCityId, city.sourceId));
    const showtimeRows = await this.db
      .select({ id: schema.showtimes.id })
      .from(schema.showtimes)
      .where(eq(schema.showtimes.cityId, city.id));

    const cinemaSourceIds = cinemaRows.map((r) => r.sourceId);
    const showtimeIds = showtimeRows.map((r) => r.id);

    const screeningCondition = this.screeningsForCityCondition(
      cinemaSourceIds,
      showtimeIds,
    );
    const screenings = screeningCondition
      ? await this.countWhere(schema.screenings, screeningCondition)
      : 0;

    return {
      entity: 'cities',
      slug,
      name: city.name,
      dependents: [
        { label: 'kina', count: cinemaSourceIds.length },
        { label: 'repertuary (showtimes)', count: showtimeIds.length },
        { label: 'seanse', count: screenings },
      ],
    };
  }

  async deleteCity(slug: string): Promise<EntityHead | null> {
    const city = await this.db.query.cities.findFirst({
      where: eq(schema.cities.slug, slug),
      columns: { id: true, sourceId: true, name: true },
    });
    if (!city) return null;

    await this.db.transaction(async (tx) => {
      const cinemaRows = await tx
        .select({ sourceId: schema.cinemas.sourceId })
        .from(schema.cinemas)
        .where(eq(schema.cinemas.sourceCityId, city.sourceId));
      const showtimeRows = await tx
        .select({ id: schema.showtimes.id })
        .from(schema.showtimes)
        .where(eq(schema.showtimes.cityId, city.id));

      const condition = this.screeningsForCityCondition(
        cinemaRows.map((r) => r.sourceId),
        showtimeRows.map((r) => r.id),
      );
      let screeningIds: number[] = [];
      if (condition) {
        const rows = await tx
          .select({ id: schema.screenings.id })
          .from(schema.screenings)
          .where(condition);
        screeningIds = rows.map((r) => r.id);
      }

      await this.deleteScreeningsAndPosts(tx, screeningIds);
      await tx
        .delete(schema.cinemas)
        .where(eq(schema.cinemas.sourceCityId, city.sourceId));
      await tx
        .delete(schema.showtimes)
        .where(eq(schema.showtimes.cityId, city.id));
      await tx.delete(schema.cities).where(eq(schema.cities.id, city.id));
    });
    return { name: city.name };
  }

  // === PRIVATE HELPERS ===

  private screeningsForCityCondition(
    cinemaSourceIds: number[],
    showtimeIds: number[],
  ): SQL | undefined {
    const parts: SQL[] = [];
    if (cinemaSourceIds.length > 0) {
      parts.push(inArray(schema.screenings.cinemaId, cinemaSourceIds));
    }
    if (showtimeIds.length > 0) {
      parts.push(inArray(schema.screenings.showtimeId, showtimeIds));
    }
    if (parts.length === 0) return undefined;
    return parts.length === 1 ? parts[0] : or(...parts);
  }

  private postsForMovieOrScreenings(
    movieId: number,
    screeningIds: number[],
  ): SQL | undefined {
    const parts: SQL[] = [eq(schema.socials_posts.movieId, movieId)];
    if (screeningIds.length > 0) {
      parts.push(inArray(schema.socials_posts.screeningId, screeningIds));
    }
    return parts.length === 1 ? parts[0] : or(...parts);
  }

  private async deleteScreeningsAndPosts(
    tx: Tx,
    screeningIds: number[],
  ): Promise<void> {
    if (screeningIds.length === 0) return;
    await tx
      .delete(schema.socials_posts)
      .where(inArray(schema.socials_posts.screeningId, screeningIds));
    await tx
      .delete(schema.screenings)
      .where(inArray(schema.screenings.id, screeningIds));
  }
}
