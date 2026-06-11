import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { SocialsGetCandidateResponse } from './socials.types';
import {
  getDate,
  getDatePlusDays,
  getTodayInPoland,
  toDateOnlyString,
} from '../lib/date';
import {
  CLASSIC_YEAR_THRESHOLD,
  CRITICS_BONUS_MIN_RATING,
  CRITICS_BONUS_MIN_VOTES,
  DEEP_CLASSIC_YEAR_THRESHOLD,
  RATING_QUALITY_BASELINE,
  RATING_QUALITY_CEILING,
  RATING_VOTES_CEILING_LOG10,
  REPEAT_COOLDOWN_DAYS,
  SCORE,
} from './socials.constants';
import type {
  CandidateByMovieSet,
  ScoredCandidate,
  ScreeningWithCinemaCity,
} from './socials.types';
import type { GetSocialCandidateQueryDto } from './dto/get-socials-candidate-query.dto';
import type { SocialsActionDto } from './dto/socials-action.dto';
import { SocialsRepository } from './socials.repository';

@Injectable()
export class SocialsService {
  constructor(private readonly repo: SocialsRepository) {}

  // === READ ===

  async getCandidate(
    query: GetSocialCandidateQueryDto,
  ): Promise<SocialsGetCandidateResponse> {
    const dateFrom = getDate(query.dateFrom);
    const dateTo = getDate(query.dateTo);
    const minScore = query.minScore;
    const platform = query.platform;
    const numberOfCandidates = query.numberOfCandidates ?? 10;
    // How many posts may already exist in the range before publishing stops.
    // Lets a platform run several slots per day (e.g. two stories) while the
    // movie cooldown below keeps the slots from repeating the same movie.
    const maxPosts = query.maxPosts ?? 1;

    const socialsPosts = await this.repo.findPostsByDateAndPlatform(
      dateFrom,
      dateTo,
      platform,
    );

    if (socialsPosts.length >= maxPosts) {
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

    // Movies posted on this platform within the cooldown window are not
    // eligible again - prevents the same movie appearing in back-to-back
    // posts when its screenings span multiple date ranges.
    const cooldownStart = getDatePlusDays(
      getTodayInPoland(),
      -REPEAT_COOLDOWN_DAYS,
    );
    const recentPosts = await this.repo.findRecentPostsByPlatform(
      platform,
      cooldownStart,
    );
    const recentMovieIds = new Set(recentPosts.map((post) => post.movieId));

    const scoredCandidates = this.computeScoredCandidates(
      screenings,
      numberOfCandidates,
    ).filter((candidate) => !recentMovieIds.has(candidate.movieId));

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

    const candidates: ScoredCandidate[] = sortedCandidates.map(
      ({ movieId, screeningId, score, breakdown }) => ({
        movieId,
        screeningId,
        score,
        breakdown,
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
        scoring: candidates,
      },
      candidates: orderedCandidates,
    };
  }

  // === WRITE ===

  async reserveCandidate(dto: SocialsActionDto): Promise<void> {
    const { platform, screeningId } = dto;

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

  async storeImage(
    data: Buffer,
    contentType: string,
  ): Promise<{ id: string }> {
    return this.repo.insertImage(data, contentType);
  }

  async getImage(id: string) {
    const image = await this.repo.findImageById(id);
    if (!image) {
      throw new NotFoundException('Image not found');
    }
    return image;
  }

  async publishCandidate(dto: SocialsActionDto): Promise<void> {
    const { platform, screeningId } = dto;

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

      // Posts are image-first: without a backdrop there is nothing to render,
      // so the movie cannot be a candidate at all.
      if (!movie.backdropUrl) continue;

      const year = movie.productionYear;
      const yearScore =
        year <= DEEP_CLASSIC_YEAR_THRESHOLD
          ? SCORE.DEEP_CLASSIC
          : year <= CLASSIC_YEAR_THRESHOLD
            ? SCORE.CLASSIC
            : SCORE.NORMAL_YEAR;

      const genreCount = movie.movies_genres?.length ?? 0;
      const multiGenreScore = genreCount > 1 ? SCORE.MULTI_GENRE : 0;

      const cityCount = cityIdsByMovieId.get(movieId)?.size ?? 0;
      const multiCityScore = cityCount > 1 ? SCORE.MULTI_CITY : 0;

      const { rating, critics } = this.computeRatingScore(movie);

      const breakdown = {
        year: yearScore,
        multiCity: multiCityScore,
        multiGenre: multiGenreScore,
        rating,
        critics,
      };
      const score =
        yearScore + multiCityScore + multiGenreScore + rating + critics;

      const existing = candidatesByMovie.get(movieId);
      if (!existing || score > existing.score) {
        candidatesByMovie.set(movieId, {
          movieId,
          screeningId,
          score,
          breakdown,
        });
      }
    }

    const sortedCandidates = Array.from(candidatesByMovie.entries()).sort(
      ([, a], [, b]) => b.score - a.score,
    );

    return sortedCandidates
      .slice(0, numberOfCandidates)
      .map(([movieId, { screeningId, score, breakdown }]) => ({
        movieId,
        screeningId,
        score,
        breakdown,
      }));
  }

  // Users rating contributes up to SCORE.RATING_MAX points: a quality factor
  // (how far the rating sits above the baseline) scaled by a confidence
  // factor (log of the vote count), so a widely rated classic beats an
  // obscure movie with the same rating. Well-reviewed movies with enough
  // critic votes get a small flat bonus on top.
  private computeRatingScore(movie: {
    usersRating: number | null;
    usersRatingVotes: number | null;
    criticsRating: number | null;
    criticsRatingVotes: number | null;
  }): { rating: number; critics: number } {
    let rating = 0;

    if (movie.usersRating !== null && (movie.usersRatingVotes ?? 0) > 0) {
      const quality = Math.min(
        1,
        Math.max(
          0,
          (movie.usersRating - RATING_QUALITY_BASELINE) /
            (RATING_QUALITY_CEILING - RATING_QUALITY_BASELINE),
        ),
      );
      const confidence = Math.min(
        1,
        Math.log10(movie.usersRatingVotes!) / RATING_VOTES_CEILING_LOG10,
      );
      rating = Math.round(SCORE.RATING_MAX * quality * confidence);
    }

    const critics =
      movie.criticsRating !== null &&
      movie.criticsRating >= CRITICS_BONUS_MIN_RATING &&
      (movie.criticsRatingVotes ?? 0) >= CRITICS_BONUS_MIN_VOTES
        ? SCORE.CRITICS_BONUS
        : 0;

    return { rating, critics };
  }
}
