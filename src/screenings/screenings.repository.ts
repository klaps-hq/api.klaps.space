import { Inject, Injectable } from '@nestjs/common';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import * as schema from '../database/schemas';
import * as relations from '../database/schemas/relations';
import { DRIZZLE } from '../database/constants';
import { and, eq, gte, inArray, isNotNull, like, lte, ne } from 'drizzle-orm';
import type { CreateScreeningDto } from './dto/create-screening.dto';
import type { Screening } from './screenings.types';

type FullSchema = typeof schema & typeof relations;

export type FindScreeningsParams = {
  startDay: Date;
  endDay: Date;
  movieId?: number;
  cityId?: number;
  citySlug?: string;
  cinemaSlug?: string;
  genreId?: number;
  genreSlug?: string;
  search?: string;
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
      params.cinemaSlug,
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
    );

    const rows = await this.db
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

    return rows.map((r) => r.movieId);
  }

  async findMoviesWithScreenings(
    movieIds: number[],
    startDay: Date,
    endDay: Date,
    locationFilter?: {
      cityId?: number;
      citySlug?: string;
      cinemaSlug?: string;
    },
  ) {
    const locationCondition = locationFilter
      ? await this.resolveLocationCondition(
          locationFilter.cityId,
          locationFilter.citySlug,
          locationFilter.cinemaSlug,
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
          ),
        },
      },
    });
  }

  async findRetroMovieIds(yearThreshold: number): Promise<number[]> {
    const rows = await this.db.query.movies.findMany({
      where: and(
        lte(schema.movies.productionYear, yearThreshold),
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
    cinemaSlug?: string,
  ) {
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
    return inArray(
      schema.screenings.movieId,
      this.db
        .select({ id: schema.movies.id })
        .from(schema.movies)
        .where(like(schema.movies.title, `%${search}%`)),
    );
  }
}
