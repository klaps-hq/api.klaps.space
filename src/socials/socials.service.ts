import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { SocialsGetCandidateResponse } from '../lib/response-types';
import {
  getDate,
  getDatePlusDays,
  getTodayInPoland,
  toDateOnlyString,
} from '../lib/date';
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
import { SocialsRepository } from './socials.repository';

@Injectable()
export class SocialsService {
  constructor(private readonly repo: SocialsRepository) {}

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

    const socialsPosts = await this.repo.findPostsByDateAndPlatform(
      dateFrom,
      dateTo,
      platform,
    );

    if (socialsPosts.length > 0) {
      return {
        publish: false,
        date: { from: dateFrom, to: dateTo },
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

    const screenings = await this.repo.findScreeningsInRange(
      dateFrom,
      dateToNextDay,
    );

    const scoredCandidates = this.computeScoredCandidates(
      screenings,
      numberOfCandidates,
    );

    if (screenings.length === 0) {
      return {
        publish: false,
        date: { from: dateFrom, to: dateTo },
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

    const screeningsWithMovieAndCinema = await this.repo.findScreeningsByIds(
      candidates.map((c) => c.screeningId),
    );

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
      date: { from: dateFrom, to: dateTo },
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

    const screening = await this.repo.findScreeningById(screeningId);
    if (!screening) {
      throw new NotFoundException('Screening not found');
    }

    const socialsPost = await this.repo.findPostByPlatformAndScreening(
      platform,
      screeningId,
    );
    if (socialsPost) {
      throw new BadRequestException('Socials post already reserved', {
        cause: 'ALREADY_RESERVED',
      });
    }

    const score = this.computeScoredCandidates([screening], 1)[0]?.score ?? 0;
    const postDate = toDateOnlyString(screening.date);

    await this.repo.upsertPost({
      postDate,
      platform,
      score,
      screeningId,
      movieId: screening.movieId,
      contentType: 'feed_candidate',
      published: false,
      reason: 'RESERVED',
    });
  }

  async publishCandidate(
    platformParam: string,
    screeningIdParam: number,
  ): Promise<void> {
    const platform = platformParam.trim().toLowerCase();
    const screeningId = screeningIdParam;

    const screening = await this.repo.findScreeningById(screeningId);
    if (!screening) {
      throw new NotFoundException('Screening not found');
    }

    const socialsPost = await this.repo.findPostByPlatformAndScreening(
      platform,
      screeningId,
    );
    if (!socialsPost) {
      throw new NotFoundException('Socials post not found');
    }

    if (socialsPost.published) {
      throw new BadRequestException('Socials post already published', {
        cause: 'ALREADY_PUBLISHED',
      });
    }

    await this.repo.markPostPublished(socialsPost.id, getTodayInPoland());
  }

  // === PRIVATE ===

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

    return sortedCandidates
      .slice(0, numberOfCandidates)
      .map(([movieId, { screeningId, score }]) => ({
        movieId,
        screeningId,
        score,
      }));
  }
}
