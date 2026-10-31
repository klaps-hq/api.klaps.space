import { BadRequestException, Inject, Injectable } from '@nestjs/common';
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
  type SQL,
} from 'drizzle-orm';
import type {
  CreateScreeningDto,
  ScreeningSeriesDto,
} from './dto/create-screening.dto';
import type { SpecialType } from '../database/schemas/series.schema';
import { toSlug } from '../lib/slug';
import type { UpdateScreeningDto } from './dto/update-screening.dto';
import type { NewScreening } from '../database/schemas/screenings.schema';
import type { Screening } from './screenings.types';
import type { ProfileInput } from './screenings-profile';
import { isChainCinema } from '../cinemas/cinema-chains';
import { isClassicSql } from '../lib/classic';

type FullSchema = typeof schema & typeof relations;

/**
 * WHERE condition on screenings: only those in independent (non-chain)
 * cinemas, see cinemas/cinema-chains.ts.
 */
export const inIndependentCinema: SQL = sql`${schema.screenings.cinemaId} not in (select ${schema.cinemas.sourceId} from ${schema.cinemas} where ${isChainCinema})`;

/** Movie columns read by mapMovieSummary. */
export const movieSummaryColumns = {
  id: true,
  sourceId: true,
  slug: true,
  url: true,
  title: true,
  titleOriginal: true,
  description: true,
  productionYear: true,
  duration: true,
  language: true,
  posterUrl: true,
  videoUrl: true,
} as const;

/**
 * Cinema and city columns for screening listings, nested once per screening.
 * Descriptions are left out on purpose and map to null: repeated on every
 * screening they were over half of the response, and clients read them from
 * the cinema and city endpoints instead (klaps.space nulls them here too).
 */
export const cinemaSummaryColumns = {
  id: true,
  sourceId: true,
  slug: true,
  name: true,
  street: true,
  url: true,
  latitude: true,
  longitude: true,
  isOpenAir: true,
} as const;

export const citySummaryColumns = {
  id: true,
  slug: true,
  name: true,
  nameDeclinated: true,
  population: true,
  voivodeship: true,
} as const;

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
  /** Only classics, see lib/classic.ts. */
  classic?: boolean;
  special?: boolean;
  specialType?: string;
  seriesSlug?: string;
};

/** Screening columns of listings, special-screening fields included. */
export const screeningListColumns = {
  id: true,
  url: true,
  date: true,
  type: true,
  isDubbing: true,
  isSubtitled: true,
  specialType: true,
  specialLabel: true,
  editionNote: true,
  seriesId: true,
} as const;

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
      this.buildClassicCondition(params.classic),
      await this.buildSpecialCondition(params),
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
      special?: boolean;
      specialType?: string;
      seriesSlug?: string;
    },
  ) {
    const specialCondition = locationFilter
      ? await this.buildSpecialCondition(locationFilter)
      : undefined;
    const locationCondition = locationFilter
      ? await this.resolveLocationCondition(
          locationFilter.cityId,
          locationFilter.citySlug,
          locationFilter.cinemaId,
          locationFilter.cinemaSlug,
          locationFilter.voivodeship,
        )
      : undefined;

    // Columns are listed explicitly: the cinema and city are nested once per
    // screening, and selecting whole rows dragged long texts (city guides and
    // descriptions, cinema descriptions and jsonb details, movie blur
    // placeholders) into the JSON built for every one of thousands of
    // screenings: about 21 MB for a two-month window.
    return this.db.query.movies.findMany({
      where: inArray(schema.movies.id, movieIds),
      columns: movieSummaryColumns,
      with: {
        movies_genres: {
          columns: {},
          with: {
            genre: {
              columns: { id: true, slug: true, name: true, description: true },
            },
          },
        },
        screenings: {
          columns: screeningListColumns,
          with: {
            cinema: {
              columns: cinemaSummaryColumns,
              with: { city: { columns: citySummaryColumns } },
            },
            series: { columns: { slug: true } },
          },
          where: and(
            gte(schema.screenings.date, startDay),
            lte(schema.screenings.date, endDay),
            locationCondition,
            this.buildOpenAirCondition(locationFilter?.openAir),
            specialCondition,
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
    classic?: boolean;
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
          this.buildClassicCondition(params.classic),
          notInArray(schema.screenings.movieId, scheduledHere),
        ),
      )
      .groupBy(schema.screenings.movieId)
      .orderBy(desc(lastScreeningDate))
      .limit(params.limit);
  }

  /**
   * Raw data for a programme profile: every screening in the scope before
   * `until` (and from `since` on, when given), plus the film, genre, director and cinema metadata it needs.
   * Rows are aggregated in buildProgrammeProfile; even a city-wide scope is a
   * few thousand narrow rows over the whole history.
   *
   * Returns null when the requested scope does not resolve, so the caller
   * can answer with an empty profile instead of a nationwide one.
   *
   * Genre and director scopes leave out screenings in chain multiplexes
   * unless `includeChains` is set: there a mass reissue (632 Avengers
   * screenings at Planet Cinema and GO KINO) would otherwise pass for the
   * director's special-screenings record. Cinema and movie scopes always
   * count every venue; a city scope does unless `independentOnly` is set.
   */
  async findProfileData(params: {
    since?: Date;
    until: Date;
    cinemaSlug?: string;
    citySlug?: string;
    genreSlug?: string;
    directorSlug?: string;
    movieSlug?: string;
    includeChains?: boolean;
    independentOnly?: boolean;
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
      .where(
        and(
          params.since ? gte(schema.screenings.date, params.since) : undefined,
          lt(schema.screenings.date, params.until),
          scope,
        ),
      );

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
    movieSlug?: string;
    includeChains?: boolean;
    independentOnly?: boolean;
  }) {
    const venueCondition = params.includeChains
      ? undefined
      : inIndependentCinema;
    if (params.cinemaSlug || params.citySlug) {
      const location = await this.resolveLocationCondition(
        undefined,
        params.citySlug,
        undefined,
        params.cinemaSlug,
      );
      if (!location) return null;
      return !params.cinemaSlug && params.independentOnly
        ? and(location, inIndependentCinema)
        : location;
    }
    if (params.genreSlug) {
      const genre = await this.db.query.genres.findFirst({
        where: eq(schema.genres.slug, params.genreSlug),
        columns: { id: true },
      });
      if (!genre) return null;
      return and(
        inArray(
          schema.screenings.movieId,
          this.db
            .select({ movieId: schema.movies_genres.movieId })
            .from(schema.movies_genres)
            .where(eq(schema.movies_genres.genreId, genre.id)),
        ),
        venueCondition,
      )!;
    }
    if (params.directorSlug) {
      const director = await this.db.query.directors.findFirst({
        where: eq(schema.directors.slug, params.directorSlug),
        columns: { id: true },
      });
      if (!director) return null;
      const directorCondition = this.buildDirectorCondition(director.id);
      return directorCondition ? and(directorCondition, venueCondition)! : null;
    }
    if (params.movieSlug) {
      const movie = await this.db.query.movies.findFirst({
        where: eq(schema.movies.slug, params.movieSlug),
        columns: { id: true },
      });
      if (!movie) return null;
      return eq(schema.screenings.movieId, movie.id);
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
    const { series, ...rest } = dto;
    const special: Partial<NewScreening> = {};
    if (dto.specialType !== undefined) special.specialType = dto.specialType;
    if (dto.specialLabel !== undefined) special.specialLabel = dto.specialLabel;
    if (dto.editionNote !== undefined) special.editionNote = dto.editionNote;
    if (series !== undefined) {
      special.seriesId = series ? await this.resolveSeriesId(series) : null;
    }
    const values = { ...rest, ...special, date: new Date(dto.date) };
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
          ...special,
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

  async update(id: number, dto: UpdateScreeningDto): Promise<Screening | null> {
    // Pre-checki FK -> czytelne 400 zamiast surowego bledu PG (23503).
    if (dto.movieId !== undefined) {
      const movie = await this.db.query.movies.findFirst({
        where: eq(schema.movies.id, dto.movieId),
        columns: { id: true },
      });
      if (!movie)
        throw new BadRequestException(`movieId ${dto.movieId} does not exist`);
    }
    if (dto.cinemaId !== undefined) {
      const cinema = await this.db.query.cinemas.findFirst({
        where: eq(schema.cinemas.sourceId, dto.cinemaId),
        columns: { sourceId: true },
      });
      if (!cinema)
        throw new BadRequestException(
          `cinemaId ${dto.cinemaId} does not exist`,
        );
    }
    if (dto.showtimeId !== undefined) {
      const showtime = await this.db.query.showtimes.findFirst({
        where: eq(schema.showtimes.id, dto.showtimeId),
        columns: { id: true },
      });
      if (!showtime)
        throw new BadRequestException(
          `showtimeId ${dto.showtimeId} does not exist`,
        );
    }

    const { date, series, ...rest } = dto;
    const values: Partial<NewScreening> = { ...rest, updatedAt: new Date() };
    if (date !== undefined) values.date = new Date(date);
    if (series !== undefined) {
      values.seriesId = series ? await this.resolveSeriesId(series) : null;
    }

    await this.db
      .update(schema.screenings)
      .set(values)
      .where(eq(schema.screenings.id, id));

    const row = await this.db.query.screenings.findFirst({
      where: eq(schema.screenings.id, id),
    });
    return row ?? null;
  }

  async deleteById(id: number): Promise<boolean> {
    return this.db.transaction(async (tx) => {
      // socials_posts moze wskazywac ten seans - czyscimy najpierw, by uniknac
      // naruszenia klucza obcego.
      await tx
        .delete(schema.socials_posts)
        .where(eq(schema.socials_posts.screeningId, id));
      const rows = await tx
        .delete(schema.screenings)
        .where(eq(schema.screenings.id, id))
        .returning({ id: schema.screenings.id });
      return rows.length > 0;
    });
  }

  // === PRIVATE ===

  /**
   * Finds the series a name belongs to through its alias, creating both on
   * first sight. Safe under parallel saves: every insert ignores conflicts
   * and the row is read back by its unique key.
   */
  private async resolveSeriesId(series: ScreeningSeriesDto): Promise<number> {
    const key = toSlug(series.name);
    const alias = await this.db.query.series_aliases.findFirst({
      where: eq(schema.series_aliases.alias, key),
    });
    let seriesId = alias?.seriesId;
    if (!seriesId) {
      await this.db
        .insert(schema.series)
        .values({
          slug: key,
          name: series.name,
          type: series.type,
          organizer: series.organizer ?? null,
          isChainProgramme: series.isChainProgramme ?? false,
        })
        .onConflictDoNothing({ target: schema.series.slug });
      const row = await this.db.query.series.findFirst({
        where: eq(schema.series.slug, key),
        columns: { id: true },
      });
      seriesId = row!.id;
      await this.db
        .insert(schema.series_aliases)
        .values({ alias: key, seriesId })
        .onConflictDoNothing();
    }
    await this.db
      .update(schema.series)
      .set({ lastSeenAt: new Date() })
      .where(eq(schema.series.id, seriesId));
    return seriesId;
  }

  /** Special-screening filters shared by the movie ids and the screenings. */
  async buildSpecialCondition(params: {
    special?: boolean;
    specialType?: string;
    seriesSlug?: string;
  }) {
    if (params.seriesSlug) {
      const series = await this.db.query.series.findFirst({
        where: eq(schema.series.slug, params.seriesSlug),
        columns: { id: true },
      });
      // Unknown series: match nothing rather than everything.
      return eq(schema.screenings.seriesId, series?.id ?? -1);
    }
    if (params.specialType) {
      return eq(
        schema.screenings.specialType,
        params.specialType as SpecialType,
      );
    }
    if (params.special) return isNotNull(schema.screenings.specialType);
    return undefined;
  }

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

  /**
   * Screenings of classics, judged per screening: the subquery is correlated
   * on the screening date, so a 2001 film is a classic in a 2026 programme
   * and not in a 2025 one (lib/classic.ts).
   */
  private buildClassicCondition(classic?: boolean) {
    if (!classic) return undefined;
    return inArray(
      schema.screenings.movieId,
      this.db
        .select({ id: schema.movies.id })
        .from(schema.movies)
        .where(
          isClassicSql(schema.movies.productionYear, schema.screenings.date),
        ),
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
