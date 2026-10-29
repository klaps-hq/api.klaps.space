import { Inject, Injectable } from '@nestjs/common';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import * as schema from '../database/schemas';
import * as relations from '../database/schemas/relations';
import { DRIZZLE } from '../database/constants';
import {
  and,
  count,
  desc,
  eq,
  gte,
  ilike,
  inArray,
  isNotNull,
  lt,
  lte,
  max,
  ne,
  notInArray,
  or,
  sql,
} from 'drizzle-orm';
import type { CreateScreeningDto } from './dto/create-screening.dto';
import type { Screening } from './screenings.types';
import type { ProfileInput } from './screenings-profile';

type FullSchema = typeof schema & typeof relations;

export type FindScreeningsParams = {
  startDay: Date;
  endDay: Date;
  movieId?: number;
  cityId?: number;
  citySlug?: string;
  voivodeship?: string;
  cinemaId?: number;
  cinemaSlug?: string;
  genreId?: number;
  genreSlug?: string;
  directorId?: number;
  limit?: number;
  search?: string;
  openAir?: boolean;
  /** Newest production year that still counts as a classic. */
  classicMaxYear?: number;
};

@Injectable()
export class ScreeningsRepository {
  constructor(
    @Inject(DRIZZLE)
    private readonly db: NodePgDatabase<FullSchema>,
  ) {}

  // === READ ===

  async findFilteredMovieIds(params: FindScreeningsParams): Promise<number[]> {
    const locationCondition = await this.resolveLocationCondition(
      params.cityId,
      params.citySlug,
      params.cinemaId,
      params.cinemaSlug,
      params.voivodeship,
    );
    const genreCondition = await this.resolveGenreCondition(
      params.genreId,
      params.genreSlug,
    );

    const whereConditions = and(
      gte(schema.screenings.date, params.startDay),
      lte(schema.screenings.date, params.endDay),
      params.movieId
        ? eq(schema.screenings.movieId, params.movieId)
        : undefined,
      locationCondition,
      this.buildSearchFilter(params.search),
      genreCondition,
      this.buildDirectorCondition(params.directorId),
      this.buildOpenAirCondition(params.openAir),
      this.buildClassicCondition(params.classicMaxYear),
    );

    const query = this.db
      .selectDistinct({ movieId: schema.screenings.movieId })
      .from(schema.screenings)
      .innerJoin(
        schema.showtimes,
        eq(schema.screenings.showtimeId, schema.showtimes.id),
      )
      .leftJoin(
        schema.movies_genres,
        eq(schema.screenings.movieId, schema.movies_genres.movieId),
      )
      .where(whereConditions);

    const rows = params.limit ? await query.limit(params.limit) : await query;

    return rows.map((r) => r.movieId);
  }

  async findMoviesWithScreenings(
    movieIds: number[],
    startDay: Date,
    endDay: Date,
    locationFilter?: {
      cityId?: number;
      citySlug?: string;
      voivodeship?: string;
      cinemaId?: number;
      cinemaSlug?: string;
      openAir?: boolean;
    },
  ) {
    const locationCondition = locationFilter
      ? await this.resolveLocationCondition(
          locationFilter.cityId,
          locationFilter.citySlug,
          locationFilter.cinemaId,
          locationFilter.cinemaSlug,
          locationFilter.voivodeship,
        )
      : undefined;

    return this.db.query.movies.findMany({
      where: inArray(schema.movies.id, movieIds),
      with: {
        movies_genres: { with: { genre: true } },
        screenings: {
          with: { cinema: { with: { city: true } } },
          where: and(
            gte(schema.screenings.date, startDay),
            lte(schema.screenings.date, endDay),
            locationCondition,
            this.buildOpenAirCondition(locationFilter?.openAir),
          ),
        },
      },
    });
  }

  async findRetroMovieIds(yearThreshold: number): Promise<number[]> {
    const rows = await this.db.query.movies.findMany({
      where: and(
        lte(schema.movies.productionYear, yearThreshold),
        ne(schema.movies.title, ''),
        ne(schema.movies.description, ''),
        isNotNull(schema.movies.backdropUrl),
        ne(schema.movies.backdropUrl, ''),
      ),
      columns: { id: true },
    });
    return rows.map((m) => m.id);
  }

  async findCandidateRetroMovieIds(
    startDay: Date,
    endDay: Date,
    retroMovieIds: number[],
  ): Promise<number[]> {
    const rows = await this.db
      .selectDistinct({ movieId: schema.screenings.movieId })
      .from(schema.screenings)
      .where(
        and(
          gte(schema.screenings.date, startDay),
          lte(schema.screenings.date, endDay),
          inArray(schema.screenings.movieId, retroMovieIds),
        ),
      )
      .orderBy(schema.screenings.movieId);

    return rows.map((r) => r.movieId);
  }

  async findMovieWithScreeningsById(
    movieId: number,
    startDay: Date,
    endDay: Date,
  ) {
    return this.db.query.movies.findFirst({
      where: eq(schema.movies.id, movieId),
      with: {
        movies_genres: { with: { genre: true } },
        // Directors feed the home hero meta line (linked like city/cinema).
        movies_directors: { with: { director: true } },
        screenings: {
          where: and(
            gte(schema.screenings.date, startDay),
            lte(schema.screenings.date, endDay),
          ),
          with: {
            cinema: { with: { city: true } },
          },
        },
      },
    });
  }

  /**
   * Newest `screenings.updatedAt` across the (optionally location-filtered)
   * set, i.e. when repertoire data was last added. Backs the visible
   * "repertuar zaktualizowano" freshness label. Returns null when no
   * screening matches the filter.
   */
  async findLastUpdatedAt(
    params: Pick<
      FindScreeningsParams,
      | 'cityId'
      | 'citySlug'
      | 'voivodeship'
      | 'cinemaId'
      | 'cinemaSlug'
      | 'directorId'
    > = {},
  ): Promise<Date | null> {
    const locationCondition = await this.resolveLocationCondition(
      params.cityId,
      params.citySlug,
      params.cinemaId,
      params.cinemaSlug,
      params.voivodeship,
    );

    const [row] = await this.db
      .select({ updatedAt: max(schema.screenings.updatedAt) })
      .from(schema.screenings)
      .where(
        and(locationCondition, this.buildDirectorCondition(params.directorId)),
      );

    return row?.updatedAt ?? null;
  }

  /**
   * Films screened in the scope between `since` (inclusive) and `until`
   * (exclusive), newest last screening first, one row per film.
   *
   * Films still scheduled in the same scope from `until` onwards are left
   * out: they already appear in the live repertoire listing, and repeating
   * them here would push genuinely past titles off the end of the list.
   *
   * A scope that was requested but does not resolve returns nothing instead
   * of silently widening to nationwide results, which is what an undefined
   * location condition would otherwise mean.
   */
  async findRecentMovieStats(params: {
    since: Date;
    until: Date;
    limit: number;
    cityId?: number;
    citySlug?: string;
    cinemaId?: number;
    cinemaSlug?: string;
    openAir?: boolean;
    classicMaxYear?: number;
  }): Promise<
    {
      movieId: number;
      lastScreeningDate: Date | null;
      screeningsCount: number;
    }[]
  > {
    const hasScope = Boolean(
      params.cinemaId || params.cinemaSlug || params.cityId || params.citySlug,
    );
    const locationCondition = await this.resolveLocationCondition(
      params.cityId,
      params.citySlug,
      params.cinemaId,
      params.cinemaSlug,
    );
    if (hasScope && !locationCondition) return [];
    const venueCondition = and(
      locationCondition,
      this.buildOpenAirCondition(params.openAir),
    );

    // Same inner join as the listings: a screening without a showtime never
    // shows up in the repertoire, so it must not show up as "recent" either.
    const scheduledHere = this.db
      .selectDistinct({ movieId: schema.screenings.movieId })
      .from(schema.screenings)
      .innerJoin(
        schema.showtimes,
        eq(schema.screenings.showtimeId, schema.showtimes.id),
      )
      .where(and(gte(schema.screenings.date, params.until), venueCondition));

    const lastScreeningDate = max(schema.screenings.date);

    return this.db
      .select({
        movieId: schema.screenings.movieId,
        lastScreeningDate,
        screeningsCount: count(),
      })
      .from(schema.screenings)
      .innerJoin(
        schema.showtimes,
        eq(schema.screenings.showtimeId, schema.showtimes.id),
      )
      .where(
        and(
          gte(schema.screenings.date, params.since),
          lt(schema.screenings.date, params.until),
          venueCondition,
          this.buildClassicCondition(params.classicMaxYear),
          notInArray(schema.screenings.movieId, scheduledHere),
        ),
      )
      .groupBy(schema.screenings.movieId)
      .orderBy(desc(lastScreeningDate))
      .limit(params.limit);
  }

  /**
   * Raw data for a programme profile: every screening in the scope before
   * `until`, plus the film, genre, director and cinema metadata it needs.
   * Rows are aggregated in buildProgrammeProfile; even a city-wide scope is a
   * few thousand narrow rows over the whole history.
   *
   * Returns null when the requested scope does not resolve, so the caller
   * can answer with an empty profile instead of a nationwide one.
   */
  async findProfileData(params: {
    until: Date;
    cinemaSlug?: string;
    citySlug?: string;
    genreSlug?: string;
    directorSlug?: string;
  }): Promise<ProfileInput | null> {
    const scope = await this.resolveProfileScope(params);
    if (!scope) return null;

    // Same inner join as the listings: a screening without a showtime never
    // appeared on the site, so it does not count towards the profile.
    const rows = await this.db
      .select({
        date: schema.screenings.date,
        movieId: schema.screenings.movieId,
        cinemaId: schema.screenings.cinemaId,
        isDubbing: schema.screenings.isDubbing,
      })
      .from(schema.screenings)
      .innerJoin(
        schema.showtimes,
        eq(schema.screenings.showtimeId, schema.showtimes.id),
      )
      .where(and(lt(schema.screenings.date, params.until), scope));

    const movieIds = [...new Set(rows.map((r) => r.movieId))];
    const cinemaIds = [...new Set(rows.map((r) => r.cinemaId))];
    if (movieIds.length === 0) {
      return { rows: [], movies: [], genres: [], directors: [], cinemas: [] };
    }

    const [movies, genres, directors, cinemas] = await Promise.all([
      this.db
        .select({
          id: schema.movies.id,
          slug: schema.movies.slug,
          title: schema.movies.title,
          productionYear: schema.movies.productionYear,
        })
        .from(schema.movies)
        .where(inArray(schema.movies.id, movieIds)),
      this.db
        .select({
          movieId: schema.movies_genres.movieId,
          slug: schema.genres.slug,
          name: schema.genres.name,
        })
        .from(schema.movies_genres)
        .innerJoin(
          schema.genres,
          eq(schema.genres.id, schema.movies_genres.genreId),
        )
        .where(inArray(schema.movies_genres.movieId, movieIds)),
      // Only directors with a page (a slug) can be named and linked.
      this.db
        .select({
          movieId: schema.movies_directors.movieId,
          slug: sql<string>`${schema.directors.slug}`,
          name: schema.directors.name,
        })
        .from(schema.movies_directors)
        .innerJoin(
          schema.directors,
          eq(schema.directors.id, schema.movies_directors.directorId),
        )
        .where(
          and(
            inArray(schema.movies_directors.movieId, movieIds),
            isNotNull(schema.directors.slug),
          ),
        ),
      this.db
        .select({
          sourceId: schema.cinemas.sourceId,
          slug: schema.cinemas.slug,
          name: schema.cinemas.name,
          citySlug: schema.cities.slug,
          cityName: schema.cities.name,
        })
        .from(schema.cinemas)
        .innerJoin(
          schema.cities,
          eq(schema.cities.sourceId, schema.cinemas.sourceCityId),
        )
        .where(inArray(schema.cinemas.sourceId, cinemaIds)),
    ]);

    return { rows, movies, genres, directors, cinemas };
  }

  /**
   * WHERE condition on screenings for one profile scope, or null when the
   * scope is missing or names nothing that exists.
   */
  private async resolveProfileScope(params: {
    cinemaSlug?: string;
    citySlug?: string;
    genreSlug?: string;
    directorSlug?: string;
  }) {
    if (params.cinemaSlug || params.citySlug) {
      return (
        (await this.resolveLocationCondition(
          undefined,
          params.citySlug,
          undefined,
          params.cinemaSlug,
        )) ?? null
      );
    }
    if (params.genreSlug) {
      const genre = await this.db.query.genres.findFirst({
        where: eq(schema.genres.slug, params.genreSlug),
        columns: { id: true },
      });
      if (!genre) return null;
      return inArray(
        schema.screenings.movieId,
        this.db
          .select({ movieId: schema.movies_genres.movieId })
          .from(schema.movies_genres)
          .where(eq(schema.movies_genres.genreId, genre.id)),
      );
    }
    if (params.directorSlug) {
      const director = await this.db.query.directors.findFirst({
        where: eq(schema.directors.slug, params.directorSlug),
        columns: { id: true },
      });
      if (!director) return null;
      return this.buildDirectorCondition(director.id) ?? null;
    }
    return null;
  }

  /**
   * Venues where the film played between `since` (inclusive) and `until`
   * (exclusive), newest last screening first, one row per cinema.
   */
  async findRecentVenueStats(params: {
    movieId: number;
    since: Date;
    until: Date;
    limit: number;
  }): Promise<
    {
      cinemaSlug: string;
      cinemaName: string;
      cityName: string;
      citySlug: string;
      lastScreeningDate: Date | null;
      screeningsCount: number;
    }[]
  > {
    const lastScreeningDate = max(schema.screenings.date);

    // Same showtime join as the listings, see findRecentMovieStats.
    return this.db
      .select({
        cinemaSlug: schema.cinemas.slug,
        cinemaName: schema.cinemas.name,
        cityName: schema.cities.name,
        citySlug: schema.cities.slug,
        lastScreeningDate,
        screeningsCount: count(),
      })
      .from(schema.screenings)
      .innerJoin(
        schema.showtimes,
        eq(schema.screenings.showtimeId, schema.showtimes.id),
      )
      .innerJoin(
        schema.cinemas,
        eq(schema.screenings.cinemaId, schema.cinemas.sourceId),
      )
      .innerJoin(
        schema.cities,
        eq(schema.cinemas.sourceCityId, schema.cities.sourceId),
      )
      .where(
        and(
          eq(schema.screenings.movieId, params.movieId),
          gte(schema.screenings.date, params.since),
          lt(schema.screenings.date, params.until),
        ),
      )
      .groupBy(schema.cinemas.id, schema.cities.id)
      .orderBy(desc(lastScreeningDate))
      .limit(params.limit);
  }

  /** Movies with their genres, the shape `mapMovieSummary` expects. */
  async findMovieSummariesByIds(movieIds: number[]) {
    if (movieIds.length === 0) return [];
    return this.db.query.movies.findMany({
      where: inArray(schema.movies.id, movieIds),
      with: { movies_genres: { with: { genre: true } } },
    });
  }

  /** Which of the given movies have a screening anywhere in the window. */
  async findMovieIdsWithScreeningsBetween(
    movieIds: number[],
    startDay: Date,
    endDay: Date,
  ): Promise<Set<number>> {
    if (movieIds.length === 0) return new Set();
    const rows = await this.db
      .selectDistinct({ movieId: schema.screenings.movieId })
      .from(schema.screenings)
      .innerJoin(
        schema.showtimes,
        eq(schema.screenings.showtimeId, schema.showtimes.id),
      )
      .where(
        and(
          inArray(schema.screenings.movieId, movieIds),
          gte(schema.screenings.date, startDay),
          lte(schema.screenings.date, endDay),
        ),
      );
    return new Set(rows.map((r) => r.movieId));
  }

  // === WRITE ===

  async insert(dto: CreateScreeningDto): Promise<Screening> {
    const values = { ...dto, date: new Date(dto.date) };
    const [result] = await this.db
      .insert(schema.screenings)
      .values(values)
      .onConflictDoUpdate({
        target: [
          schema.screenings.movieId,
          schema.screenings.cinemaId,
          schema.screenings.date,
          schema.screenings.type,
          schema.screenings.isDubbing,
          schema.screenings.isSubtitled,
        ],
        set: {
          url: dto.url,
          movieId: dto.movieId,
          showtimeId: dto.showtimeId,
          cinemaId: dto.cinemaId,
          type: dto.type,
          date: values.date,
          isDubbing: dto.isDubbing,
          isSubtitled: dto.isSubtitled,
        },
      })
      .returning({ id: schema.screenings.id });

    const screening = await this.db.query.screenings.findFirst({
      where: eq(schema.screenings.id, result.id),
    });
    if (!screening)
      throw new Error(`Failed to retrieve inserted screening id=${result.id}`);
    return screening;
  }

  // === PRIVATE ===

  private async resolveLocationCondition(
    cityId?: number,
    citySlug?: string,
    cinemaId?: number,
    cinemaSlug?: string,
    voivodeship?: string,
  ) {
    if (cinemaId) {
      const cinema = await this.db.query.cinemas.findFirst({
        where: eq(schema.cinemas.id, cinemaId),
        columns: { sourceId: true },
      });
      if (!cinema) return undefined;
      return eq(schema.screenings.cinemaId, cinema.sourceId);
    }

    if (cinemaSlug) {
      const cinema = await this.db.query.cinemas.findFirst({
        where: eq(schema.cinemas.slug, cinemaSlug),
        columns: { sourceId: true },
      });
      if (!cinema) return undefined;
      return eq(schema.screenings.cinemaId, cinema.sourceId);
    }

    if (cityId || citySlug) {
      const city = await this.db.query.cities.findFirst({
        where: cityId
          ? eq(schema.cities.id, cityId)
          : eq(schema.cities.slug, citySlug!),
        columns: { sourceId: true },
      });
      if (!city) return undefined;
      return inArray(
        schema.screenings.cinemaId,
        this.db
          .select({ sourceId: schema.cinemas.sourceId })
          .from(schema.cinemas)
          .where(eq(schema.cinemas.sourceCityId, city.sourceId)),
      );
    }

    if (voivodeship) {
      return inArray(
        schema.screenings.cinemaId,
        this.db
          .select({ sourceId: schema.cinemas.sourceId })
          .from(schema.cinemas)
          .innerJoin(
            schema.cities,
            eq(schema.cinemas.sourceCityId, schema.cities.sourceId),
          )
          .where(eq(schema.cities.voivodeship, voivodeship)),
      );
    }

    return undefined;
  }

  private async resolveGenreCondition(genreId?: number, genreSlug?: string) {
    if (genreId) return eq(schema.movies_genres.genreId, genreId);
    if (genreSlug) {
      const genre = await this.db.query.genres.findFirst({
        where: eq(schema.genres.slug, genreSlug),
        columns: { id: true },
      });
      if (!genre) return undefined;
      return eq(schema.movies_genres.genreId, genre.id);
    }
    return undefined;
  }

  private buildSearchFilter(search?: string) {
    if (!search) return undefined;
    // Match both the Polish title and the original title, so e.g. "fight"
    // surfaces "Podziemny krąg" (Fight Club).
    return inArray(
      schema.screenings.movieId,
      this.db
        .select({ id: schema.movies.id })
        .from(schema.movies)
        .where(
          or(
            ilike(schema.movies.title, `%${search}%`),
            ilike(schema.movies.titleOriginal, `%${search}%`),
          ),
        ),
    );
  }

  private buildOpenAirCondition(openAir?: boolean) {
    if (!openAir) return undefined;
    return inArray(
      schema.screenings.cinemaId,
      this.db
        .select({ sourceId: schema.cinemas.sourceId })
        .from(schema.cinemas)
        .where(eq(schema.cinemas.isOpenAir, true)),
    );
  }

  private buildClassicCondition(classicMaxYear?: number) {
    if (classicMaxYear === undefined) return undefined;
    return inArray(
      schema.screenings.movieId,
      this.db
        .select({ id: schema.movies.id })
        .from(schema.movies)
        .where(lte(schema.movies.productionYear, classicMaxYear)),
    );
  }

  private buildDirectorCondition(directorId?: number) {
    if (!directorId) return undefined;
    return inArray(
      schema.screenings.movieId,
      this.db
        .select({ movieId: schema.movies_directors.movieId })
        .from(schema.movies_directors)
        .where(eq(schema.movies_directors.directorId, directorId)),
    );
  }
}
