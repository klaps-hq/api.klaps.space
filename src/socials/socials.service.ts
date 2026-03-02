import { Inject, Injectable } from '@nestjs/common';
import type { MySql2Database } from 'drizzle-orm/mysql2';
import { DRIZZLE } from '../database/constants';
import * as schema from '../database/schemas';
import * as relations from '../database/schemas/relations';
import type { SocialsGetCandidateResponse } from '../lib/response-types';
import { getDate } from '../lib/date';
import { and, asc, eq, gte, inArray, lte } from 'drizzle-orm';
import {
  CLASSIC_YEAR_THRESHOLD,
  SOCIALS_CONTENT_TYPE,
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
        eq(
          schema.socials_posts.contentType,
          SOCIALS_CONTENT_TYPE.FEED_CANDIDATE,
        ),
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

    const screenings = await this.db.query.screenings.findMany({
      where: and(
        gte(schema.screenings.date, new Date(dateFrom)),
        lte(schema.screenings.date, new Date(dateTo)),
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
      candidates: screeningsWithMovieAndCinema,
    };
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
