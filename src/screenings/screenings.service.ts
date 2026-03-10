import { Inject, Injectable } from '@nestjs/common';
import type { MySql2Database } from 'drizzle-orm/mysql2';
import { DRIZZLE } from '../database/constants';
import * as schema from '../database/schemas';
import * as relations from '../database/schemas/relations';
import { getDateRangeUpToMonthFromNow } from '../lib/utils';
import { randomInt } from 'node:crypto';
import type { GetScreeningsParams, Screening } from './screenings.types';
import type { CreateScreeningDto } from './dto/create-screening.dto';
import { and, eq, gte, inArray, isNotNull, like, lte, ne } from 'drizzle-orm';
import type {
  ScreeningResponse,
  ScreeningGroupResponse,
  RandomScreeningResponse,
} from '../lib/response-types';
import {
  mapScreening,
  mapScreeningGroup,
  mapMovieHero,
} from '../lib/response-mappers';

type FullSchema = typeof schema & typeof relations;

const RETRO_YEAR_THRESHOLD = 2026;

@Injectable()
export class ScreeningsService {
  constructor(
    @Inject(DRIZZLE)
    private readonly db: MySql2Database<FullSchema>,
  ) {}

  // === READ ===

  async getScreenings(
    params?: GetScreeningsParams,
  ): Promise<(ScreeningResponse | ScreeningGroupResponse)[]> {
    const { startDay, endDay } = getDateRangeUpToMonthFromNow(
      params?.dateFrom,
      params?.dateTo,
    );

    const cityCondition = params?.cityId
      ? eq(schema.cities.id, params.cityId)
      : params?.citySlug
        ? eq(schema.cities.slug, params.citySlug)
        : undefined;

    const citySubquery = cityCondition
      ? inArray(
          schema.screenings.cinemaId,
          this.db
            .select({ sourceId: schema.cinemas.sourceId })
            .from(schema.cinemas)
            .where(
              inArray(
                schema.cinemas.sourceCityId,
                this.db
                  .select({ sourceId: schema.cities.sourceId })
                  .from(schema.cities)
                  .where(cityCondition),
              ),
            ),
        )
      : params?.cinemaSlug
        ? inArray(
            schema.screenings.cinemaId,
            this.db
              .select({ sourceId: schema.cinemas.sourceId })
              .from(schema.cinemas)
              .where(eq(schema.cinemas.slug, params.cinemaSlug)),
          )
        : undefined;

    const searchSubquery = params?.search
      ? inArray(
          schema.screenings.movieId,
          this.db
            .select({ id: schema.movies.id })
            .from(schema.movies)
            .where(like(schema.movies.title, `%${params.search}%`)),
        )
      : undefined;

    const genreCondition = params?.genreId
      ? eq(schema.movies_genres.genreId, params.genreId)
      : params?.genreSlug
        ? inArray(
            schema.movies_genres.genreId,
            this.db
              .select({ id: schema.genres.id })
              .from(schema.genres)
              .where(eq(schema.genres.slug, params.genreSlug)),
          )
        : undefined;

    const whereConditions = and(
      gte(schema.screenings.date, startDay),
      lte(schema.screenings.date, endDay),
      params?.movieId
        ? eq(schema.screenings.movieId, params.movieId)
        : undefined,
      citySubquery,
      searchSubquery,
      genreCondition,
    );

    const movieIdsResult = await this.db
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

    const movieIds = movieIdsResult.map((r) => r.movieId);
    if (movieIds.length === 0) return [];

    const movies = await this.db.query.movies.findMany({
      where: inArray(schema.movies.id, movieIds),
      with: {
        movies_genres: { with: { genre: true } },
        screenings: {
          with: { cinema: { with: { city: true } } },
          where: and(
            gte(schema.screenings.date, startDay),
            lte(schema.screenings.date, endDay),
            citySubquery,
          ),
        },
      },
    });

    const filtered = movies.filter(({ screenings }) => screenings.length > 0);

    if (params?.movieId) {
      return filtered.flatMap(({ screenings }) => screenings.map(mapScreening));
    }

    return filtered.map(({ screenings, ...movie }) =>
      mapScreeningGroup(movie, screenings),
    );
  }

  async getRandomRetroScreening(): Promise<RandomScreeningResponse | null> {
    const { startDay, endDay } = getDateRangeUpToMonthFromNow();

    const retroMovies = await this.db.query.movies.findMany({
      where: and(
        lte(schema.movies.productionYear, RETRO_YEAR_THRESHOLD),
        isNotNull(schema.movies.backdropUrl),
        ne(schema.movies.backdropUrl, ''),
      ),
      columns: { id: true },
    });

    const retroMovieIds = retroMovies.map((m) => m.id);
    if (retroMovieIds.length === 0) return null;

    const candidateMovies = await this.db
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

    if (candidateMovies.length === 0) return null;

    const chosenIndex = randomInt(0, candidateMovies.length);
    const chosenMovieId = candidateMovies[chosenIndex].movieId;

    const movie = await this.db.query.movies.findFirst({
      where: eq(schema.movies.id, chosenMovieId),
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

    if (!movie || movie.screenings.length === 0) return null;

    const { screenings, ...movieData } = movie;
    const randomScreeningIndex = randomInt(0, screenings.length);
    const chosenScreening = screenings[randomScreeningIndex];

    return {
      movie: mapMovieHero(movieData),
      screening: mapScreening(chosenScreening),
    };
  }

  // === WRITE ===

  async createScreening(dto: CreateScreeningDto): Promise<Screening> {
    const values = { ...dto, date: new Date(dto.date) };
    const [result] = await this.db
      .insert(schema.screenings)
      .values(values)
      .onDuplicateKeyUpdate({
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
      .$returningId();
    const screening = await this.db.query.screenings.findFirst({
      where: eq(schema.screenings.id, result.id),
    });
    return screening!;
  }
}
