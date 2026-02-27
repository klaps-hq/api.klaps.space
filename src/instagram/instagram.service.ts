import { Inject, Injectable } from '@nestjs/common';
import type { MySql2Database } from 'drizzle-orm/mysql2';
import { and, eq, gte, isNotNull, lt, lte, ne } from 'drizzle-orm';
import { DRIZZLE } from '../database/constants';
import * as schema from '../database/schemas';
import * as relations from '../database/schemas/relations';
import { getTodayInPoland } from '../lib/utils';
import { mapMovieHero, mapScreening } from '../lib/response-mappers';
import type { InstagramCandidateResponse } from '../lib/response-types';
import {
  CLASSIC_YEAR_THRESHOLD,
  DEEP_CLASSIC_YEAR_THRESHOLD,
  SCREENING_WINDOW_MIN_DAYS,
  SCREENING_WINDOW_MAX_DAYS,
  NEARBY_SCREENING_MAX_DAYS,
  COOLDOWN_HARD_DAYS,
  COOLDOWN_SOFT_START_DAYS,
  COOLDOWN_SOFT_END_DAYS,
  MIN_SCORE,
  SCORE,
  type ScoredCandidate,
} from './instagram.types';

type FullSchema = typeof schema & typeof relations;

@Injectable()
export class InstagramService {
  constructor(
    @Inject(DRIZZLE)
    private readonly db: MySql2Database<FullSchema>,
  ) {}

  async getCandidate(dateParam?: string): Promise<InstagramCandidateResponse> {
    const date = dateParam ?? getTodayInPoland();

    const cached = await this.findCachedDecision(date);
    if (cached) return cached;

    const windowStart = this.addDays(date, SCREENING_WINDOW_MIN_DAYS);
    const windowEnd = this.addDays(date, SCREENING_WINDOW_MAX_DAYS);
    windowEnd.setHours(23, 59, 59, 999);

    const { hardCooldownIds, softCooldownIds } =
      await this.getCooldownMovieIds(date);

    const movies = await this.db.query.movies.findMany({
      where: and(
        lt(schema.movies.productionYear, CLASSIC_YEAR_THRESHOLD),
        isNotNull(schema.movies.backdropUrl),
        ne(schema.movies.backdropUrl, ''),
      ),
      with: {
        movies_genres: { with: { genre: true } },
        screenings: {
          where: and(
            gte(schema.screenings.date, windowStart),
            lte(schema.screenings.date, windowEnd),
            isNotNull(schema.screenings.url),
            ne(schema.screenings.url, ''),
          ),
          with: { cinema: { with: { city: true } } },
        },
      },
    });

    const candidates = movies.filter(
      (m) => m.screenings.length > 0 && !hardCooldownIds.has(m.id),
    );

    let best:
      | (ScoredCandidate & { movieIdx: number; screeningIdx: number })
      | null = null;

    for (let mi = 0; mi < candidates.length; mi++) {
      const movie = candidates[mi];
      for (let si = 0; si < movie.screenings.length; si++) {
        const screening = movie.screenings[si];
        const score = this.scoreCandidate(
          movie,
          screening,
          date,
          softCooldownIds,
        );
        if (!best || score > best.score) {
          best = {
            movieId: movie.id,
            screeningId: screening.id,
            score,
            movieIdx: mi,
            screeningIdx: si,
          };
        }
      }
    }

    if (best && best.score >= MIN_SCORE) {
      const movie = candidates[best.movieIdx];
      const screening = movie.screenings[best.screeningIdx];

      await this.persistDecision({
        postDate: date,
        movieId: best.movieId,
        screeningId: best.screeningId,
        score: best.score,
        published: true,
        reason: 'HIGH_QUALITY_CANDIDATE',
      });

      return {
        publish: true,
        date,
        score: best.score,
        reason: 'HIGH_QUALITY_CANDIDATE',
        movie: mapMovieHero(movie),
        screening: mapScreening(screening),
      };
    }

    await this.persistDecision({
      postDate: date,
      movieId: null,
      screeningId: null,
      score: best?.score ?? 0,
      published: false,
      reason: 'NO_HIGH_QUALITY_CANDIDATE',
    });

    return {
      publish: false,
      date,
      reason: 'NO_HIGH_QUALITY_CANDIDATE',
      meta: {
        candidatesChecked: candidates.length,
        bestScore: best?.score ?? null,
        minScore: MIN_SCORE,
      },
    };
  }

  // ── Scoring ────────────────────────────────────────────────

  private scoreCandidate(
    movie: {
      id: number;
      productionYear: number;
      movies_genres: unknown[];
      screenings: Array<{
        date: Date;
        isSubtitled: boolean | number;
        cinema?: { city?: { id: number } | null } | null;
      }>;
    },
    screening: {
      date: Date;
      isSubtitled: boolean | number;
    },
    baseDate: string,
    softCooldownIds: Set<number>,
  ): number {
    let score = 0;

    const daysUntil = this.daysBetween(baseDate, screening.date);
    if (
      daysUntil >= SCREENING_WINDOW_MIN_DAYS &&
      daysUntil <= NEARBY_SCREENING_MAX_DAYS
    ) {
      score += SCORE.SCREENING_NEARBY;
    } else if (
      daysUntil > NEARBY_SCREENING_MAX_DAYS &&
      daysUntil <= SCREENING_WINDOW_MAX_DAYS
    ) {
      score += SCORE.SCREENING_UPCOMING;
    }

    if (movie.productionYear < DEEP_CLASSIC_YEAR_THRESHOLD) {
      score += SCORE.DEEP_CLASSIC;
    } else {
      score += SCORE.CLASSIC;
    }

    const uniqueCityIds = new Set(
      movie.screenings
        .map((s) => s.cinema?.city?.id)
        .filter((id): id is number => id != null && id > 0),
    );
    if (uniqueCityIds.size >= 2) score += SCORE.MULTI_CITY;

    if (movie.movies_genres.length >= 2) score += SCORE.MULTI_GENRE;

    if (screening.isSubtitled) score += SCORE.SUBTITLED;

    if (softCooldownIds.has(movie.id)) score += SCORE.SOFT_COOLDOWN_PENALTY;

    return score;
  }

  // ── Cache ──────────────────────────────────────────────────

  private async findCachedDecision(
    date: string,
  ): Promise<InstagramCandidateResponse | null> {
    const row = await this.db.query.instagram_posts.findFirst({
      where: eq(schema.instagram_posts.postDate, date),
    });
    if (!row) return null;

    if (row.published && row.movieId && row.screeningId) {
      const movie = await this.db.query.movies.findFirst({
        where: eq(schema.movies.id, row.movieId),
        with: { movies_genres: { with: { genre: true } } },
      });
      const screening = await this.db.query.screenings.findFirst({
        where: eq(schema.screenings.id, row.screeningId),
        with: { cinema: { with: { city: true } } },
      });
      if (!movie || !screening) return null;

      return {
        publish: true,
        date,
        score: row.score,
        reason: 'HIGH_QUALITY_CANDIDATE',
        movie: mapMovieHero(movie),
        screening: mapScreening(screening),
      };
    }

    return {
      publish: false,
      date,
      reason: row.reason as 'NO_HIGH_QUALITY_CANDIDATE',
      meta: {
        candidatesChecked: 0,
        bestScore: row.score > 0 ? row.score : null,
        minScore: MIN_SCORE,
      },
    };
  }

  // ── Cooldown ───────────────────────────────────────────────

  private async getCooldownMovieIds(date: string): Promise<{
    hardCooldownIds: Set<number>;
    softCooldownIds: Set<number>;
  }> {
    const lookbackStart = this.formatDate(
      this.addDays(date, -COOLDOWN_SOFT_END_DAYS),
    );

    const recentPosts = await this.db.query.instagram_posts.findMany({
      where: and(
        gte(schema.instagram_posts.postDate, lookbackStart),
        eq(schema.instagram_posts.published, true),
      ),
      columns: { movieId: true, postDate: true },
    });

    const hardCutoff = this.formatDate(this.addDays(date, -COOLDOWN_HARD_DAYS));
    const softStart = this.formatDate(
      this.addDays(date, -COOLDOWN_SOFT_END_DAYS),
    );
    const softEnd = this.formatDate(
      this.addDays(date, -COOLDOWN_SOFT_START_DAYS),
    );

    const hardCooldownIds = new Set<number>();
    const softCooldownIds = new Set<number>();

    for (const post of recentPosts) {
      if (!post.movieId) continue;
      const pd = post.postDate;
      if (pd >= hardCutoff) {
        hardCooldownIds.add(post.movieId);
      } else if (pd >= softStart && pd <= softEnd) {
        softCooldownIds.add(post.movieId);
      }
    }

    return { hardCooldownIds, softCooldownIds };
  }

  // ── Persistence ────────────────────────────────────────────

  private async persistDecision(values: {
    postDate: string;
    movieId: number | null;
    screeningId: number | null;
    score: number;
    published: boolean;
    reason: string;
  }): Promise<void> {
    await this.db
      .insert(schema.instagram_posts)
      .values(values)
      .onDuplicateKeyUpdate({ set: { postDate: values.postDate } });
  }

  // ── Date helpers ───────────────────────────────────────────

  private addDays(dateStr: string, days: number): Date {
    const d = new Date(dateStr + 'T00:00:00');
    d.setDate(d.getDate() + days);
    return d;
  }

  private daysBetween(dateStr: string, target: Date): number {
    const base = new Date(dateStr + 'T00:00:00');
    const t = new Date(target);
    t.setHours(0, 0, 0, 0);
    return Math.round((t.getTime() - base.getTime()) / (1000 * 60 * 60 * 24));
  }

  private formatDate(d: Date): string {
    return d.toISOString().slice(0, 10);
  }
}
