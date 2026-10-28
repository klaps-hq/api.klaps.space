import { Inject, Injectable } from '@nestjs/common';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { and, eq, gte, inArray, like, lt } from 'drizzle-orm';
import * as schema from '../database/schemas';
import * as relations from '../database/schemas/relations';
import { DRIZZLE } from '../database/constants';
import { CLASSIC_YEAR_THRESHOLD } from './socials.constants';

type FullSchema = typeof schema & typeof relations;

// Data for the editorial series in klaps.radar ("Klaps w liczbach", director
// retrospectives). Only the columns the aggregations need are selected:
// a month of screenings is tens of thousands of rows.
@Injectable()
export class SocialsSeriesRepository {
  constructor(
    @Inject(DRIZZLE)
    private readonly db: NodePgDatabase<FullSchema>,
  ) {}

  // Screenings of classics (made before CLASSIC_YEAR_THRESHOLD) in [from, to).
  async findClassicScreenings(from: Date, to: Date) {
    return this.db
      .select({
        movieId: schema.screenings.movieId,
        cinemaId: schema.screenings.cinemaId,
      })
      .from(schema.screenings)
      .innerJoin(schema.movies, eq(schema.movies.id, schema.screenings.movieId))
      .where(
        and(
          gte(schema.screenings.date, from),
          lt(schema.screenings.date, to),
          lt(schema.movies.productionYear, CLASSIC_YEAR_THRESHOLD),
        ),
      );
  }

  // Upcoming screenings with their directors, for retrospective detection.
  async findDirectorScreenings(from: Date, to: Date) {
    return this.db
      .select({
        movieId: schema.screenings.movieId,
        date: schema.screenings.date,
        directorId: schema.movies_directors.directorId,
        cityId: schema.cities.id,
      })
      .from(schema.screenings)
      .innerJoin(
        schema.movies_directors,
        eq(schema.movies_directors.movieId, schema.screenings.movieId),
      )
      .innerJoin(
        schema.cinemas,
        eq(schema.cinemas.id, schema.screenings.cinemaId),
      )
      .innerJoin(
        schema.cities,
        eq(schema.cities.sourceId, schema.cinemas.sourceCityId),
      )
      .where(
        and(gte(schema.screenings.date, from), lt(schema.screenings.date, to)),
      );
  }

  async findMoviesByIds(ids: number[]) {
    if (!ids.length) return [];
    return this.db
      .select({
        id: schema.movies.id,
        slug: schema.movies.slug,
        title: schema.movies.title,
        titleOriginal: schema.movies.titleOriginal,
        productionYear: schema.movies.productionYear,
        description: schema.movies.description,
        duration: schema.movies.duration,
        posterUrl: schema.movies.posterUrl,
        backdropUrl: schema.movies.backdropUrl,
      })
      .from(schema.movies)
      .where(inArray(schema.movies.id, ids));
  }

  async findCinemasByIds(ids: number[]) {
    if (!ids.length) return [];
    return this.db
      .select({
        id: schema.cinemas.id,
        name: schema.cinemas.name,
        slug: schema.cinemas.slug,
        latitude: schema.cinemas.latitude,
        longitude: schema.cinemas.longitude,
        cityId: schema.cities.id,
        cityName: schema.cities.name,
        citySlug: schema.cities.slug,
        cityNameDeclinated: schema.cities.nameDeclinated,
      })
      .from(schema.cinemas)
      .innerJoin(
        schema.cities,
        eq(schema.cities.sourceId, schema.cinemas.sourceCityId),
      )
      .where(inArray(schema.cinemas.id, ids));
  }

  async findDirectorsByIds(ids: number[]) {
    if (!ids.length) return [];
    return this.db
      .select({
        id: schema.directors.id,
        name: schema.directors.name,
        slug: schema.directors.slug,
        photoUrl: schema.directors.photoUrl,
      })
      .from(schema.directors)
      .where(inArray(schema.directors.id, ids));
  }

  // Series posts are rows of socials_posts with contentType = series kind and
  // reason "SERIES:<kind>:<key>" (a month or a director id).
  async findSeriesPosts(kind: string, sincePostDate: string) {
    return this.db
      .select({
        postDate: schema.socials_posts.postDate,
        reason: schema.socials_posts.reason,
      })
      .from(schema.socials_posts)
      .where(
        and(
          eq(schema.socials_posts.contentType, kind),
          gte(schema.socials_posts.postDate, sincePostDate),
          like(schema.socials_posts.reason, 'SERIES:%'),
        ),
      );
  }

  async insertSeriesPost(values: {
    postDate: string;
    platform: string;
    contentType: string;
    reason: string;
  }): Promise<void> {
    await this.db
      .insert(schema.socials_posts)
      .values({ ...values, score: 0, published: true })
      .onConflictDoUpdate({
        target: [
          schema.socials_posts.postDate,
          schema.socials_posts.platform,
          schema.socials_posts.contentType,
        ],
        set: { reason: values.reason, published: true },
      });
  }
}
