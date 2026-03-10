import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { MySql2Database } from 'drizzle-orm/mysql2';
import { DRIZZLE } from '../database/constants';
import * as schema from '../database/schemas';
import * as relations from '../database/schemas/relations';
import type { SocialsGetCandidateResponse } from '../lib/response-types';
import {
  getDate,
  getDatePlusDays,
  getTodayInPoland,
  toDateOnlyString,
} from '../lib/date';
import { and, asc, eq, gte, inArray, lt, lte } from 'drizzle-orm';
import {
  CLASSIC_YEAR_THRESHOLD,
  DEEP_CLASSIC_YEAR_THRESHOLD,
  SCORE,
} from './socials.constants';
import type {
  CandidateByMovieSet,
  ScoredCandidate,
  ScreeningWithCinemaCity,
} from './socials.types';

type FullSchema = typeof schema & typeof relations;
@Injectable()
export class SocialsService {
  constructor(
    @Inject(DRIZZLE)
    private readonly db: MySql2Database<FullSchema>,
  ) {}

  // === READ ===
  async getCandidate(
    dateFromParam: string,
    dateToParam: string,
    minScoreParam: number,
    platformParam: string,
    numberOfCandidatesParam?: number,
  ): Promise<SocialsGetCandidateResponse> {
    const dateFrom = getDate(dateFromParam);
    const dateTo = getDate(dateToParam);

    const minScore = Number(minScoreParam);
    const platform = platformParam.trim().toLowerCase();
    const numberOfCandidates = numberOfCandidatesParam ?? 10;

    const socialsPosts = await this.db.query.socials_posts.findMany({
      where: and(
        gte(schema.socials_posts.postDate, dateFrom),
        lte(schema.socials_posts.postDate, dateTo),
        eq(schema.socials_posts.platform, platform),
      ),
    });

    if (socialsPosts.length > 0) {
      return {
        publish: false,
        date: {
          from: dateFrom,
          to: dateTo,
        },
        reason: 'ALREADY_PUBLISHED',
        meta: {
          candidatesChecked: socialsPosts.length,
          bestScore: null,
          minScore,
        },
        candidates: [],
      };
    }

    const dateToNextDay = getDatePlusDays(dateTo, 1);

    const screenings = await this.db.query.screenings.findMany({
      where: and(
        gte(schema.screenings.date, new Date(dateFrom)),
        lt(schema.screenings.date, new Date(dateToNextDay)),
      ),
      orderBy: asc(schema.screenings.date),
      with: {
        movie: {
          with: {
            movies_genres: true,
          },
        },
        cinema: {
          with: {
            city: true,
          },
        },
      },
    });

    const scoredCandidates = this.computeScoredCandidates(
      screenings,
      numberOfCandidates,
    );

    if (screenings.length === 0) {
      return {
        publish: false,
        date: {
          from: dateFrom,
          to: dateTo,
        },
        reason: 'NO_SCREENINGS_IN_RANGE',
        meta: {
          candidatesChecked: screenings.length,
          bestScore: null,
          minScore,
        },
        candidates: [],
      };
    }

    const sortedCandidates = scoredCandidates.sort((a, b) => b.score - a.score);
    const bestCandidate = sortedCandidates[0];
    const bestScore = bestCandidate?.score ?? null;
    const hasHighQualityCandidate = bestScore !== null && bestScore >= minScore;

    const candidates = sortedCandidates.map(
      ({ movieId, screeningId, score }) => ({
        movieId,
        screeningId,
        score,
      }),
    );

    const screeningsWithMovieAndCinema =
      await this.db.query.screenings.findMany({
        where: inArray(
          schema.screenings.id,
          candidates.map((candidate) => candidate.screeningId),
        ),
        with: {
          movie: {
            with: {
              movies_genres: true,
            },
          },
          cinema: {
            with: {
              city: true,
            },
          },
        },
      });

    const screeningById = new Map(
      screeningsWithMovieAndCinema.map((s) => [s.id, s]),
    );

    const orderedCandidates = candidates
      .map((c) => screeningById.get(c.screeningId))
      .filter(
        (s): s is (typeof screeningsWithMovieAndCinema)[number] => s != null,
      );

    return {
      publish: hasHighQualityCandidate,
      date: {
        from: dateFrom,
        to: dateTo,
      },
      reason: hasHighQualityCandidate
        ? 'HAS_HIGH_QUALITY_CANDIDATE'
        : 'NO_HIGH_QUALITY_CANDIDATE',
      meta: {
        candidatesChecked: scoredCandidates.length,
        bestScore,
        minScore,
      },
      candidates: orderedCandidates,
    };
  }

  // === WRITE ===
  async reserveCandidate(
    platformParam: string,
    screeningIdParam: number,
  ): Promise<void> {
    const platform = platformParam.trim().toLowerCase();
    const screeningId = screeningIdParam;

    const screening = await this.db.query.screenings.findFirst({
      where: eq(schema.screenings.id, screeningId),
    });

    if (!screening) {
      throw new NotFoundException('Screening not found');
    }

    const socialsPost = await this.db.query.socials_posts.findFirst({
      where: and(
        eq(schema.socials_posts.platform, platform),
        eq(schema.socials_posts.screeningId, screeningId),
      ),
    });

    if (socialsPost) {
      throw new BadRequestException('Socials post already reserved', {
        cause: 'ALREADY_RESERVED',
      });
    }

    const score = this.computeScoredCandidates([screening], 1)[0]?.score ?? 0;
    const postDate = toDateOnlyString(screening.date);

    await this.db
      .insert(schema.socials_posts)
      .values({
        postDate,
        platform,
        score,
        screeningId,
        movieId: screening.movieId,
        contentType: 'feed_candidate',
        published: false,
        reason: 'RESERVED',
      })
      .onDuplicateKeyUpdate({
        set: {
          published: false,
          reason: 'RESERVED',
          postDate,
          score,
          screeningId,
          platform,
          movieId: screening.movieId,
          contentType: 'feed_candidate',
        },
      });
  }

  async publishCandidate(
    platformParam: string,
    screeningIdParam: number,
  ): Promise<void> {
    const platform = platformParam.trim().toLowerCase();
    const screeningId = screeningIdParam;

    const screening = await this.db.query.screenings.findFirst({
      where: eq(schema.screenings.id, screeningId),
    });

    if (!screening) {
      throw new NotFoundException('Screening not found');
    }

    const socialsPost = await this.db.query.socials_posts.findFirst({
      where: and(
        eq(schema.socials_posts.platform, platform),
        eq(schema.socials_posts.screeningId, screeningId),
      ),
    });

    if (!socialsPost) {
      throw new NotFoundException('Socials post not found');
    }

    const socialPostStatus = socialsPost.published
      ? 'ALREADY_PUBLISHED'
      : 'PUBLISHED';

    if (socialPostStatus === 'ALREADY_PUBLISHED') {
      throw new BadRequestException('Socials post already published', {
        cause: socialPostStatus,
      });
    }

    await this.db
      .update(schema.socials_posts)
      .set({
        published: true,
        reason: 'PUBLISHED',
        postDate: getTodayInPoland(),
      })
      .where(eq(schema.socials_posts.id, socialsPost.id));
  }

  private computeScoredCandidates(
    screenings: ScreeningWithCinemaCity[],
    numberOfCandidates: number,
  ): ScoredCandidate[] {
    const cityIdsByMovieId = new Map<number, Set<number>>();

    for (const s of screenings) {
      const cityId = s.cinema?.city?.id;

      if (cityId === undefined) continue;

      const set = cityIdsByMovieId.get(s.movieId) ?? new Set();
      set.add(cityId);

      cityIdsByMovieId.set(s.movieId, set);
    }

    const candidatesByMovie = new Map<number, CandidateByMovieSet>();

    for (const screening of screenings) {
      const { movieId, movie, id: screeningId } = screening;
      if (!movie) continue;

      let score = 0;
      const year = movie.productionYear;

      if (year <= DEEP_CLASSIC_YEAR_THRESHOLD) {
        score += SCORE.DEEP_CLASSIC;
      } else if (year <= CLASSIC_YEAR_THRESHOLD) {
        score += SCORE.CLASSIC;
      } else {
        score += SCORE.NORMAL_YEAR;
      }

      const genreCount = movie.movies_genres?.length ?? 0;
      if (genreCount > 1) {
        score += SCORE.MULTI_GENRE;
      }

      const cityCount = cityIdsByMovieId.get(movieId)?.size ?? 0;
      if (cityCount > 1) {
        score += SCORE.MULTI_CITY;
      }

      const existing = candidatesByMovie.get(movieId);
      if (!existing || score > existing.score) {
        candidatesByMovie.set(movieId, { movieId, screeningId, score });
      }
    }

    const sortedCandidates = Array.from(candidatesByMovie.entries()).sort(
      ([, a], [, b]) => b.score - a.score,
    );

    const topCandidates = sortedCandidates
      .slice(0, numberOfCandidates)
      .map(([movieId, { screeningId, score }]) => {
        return { movieId, screeningId, score };
      });

    return topCandidates;
  }
}
