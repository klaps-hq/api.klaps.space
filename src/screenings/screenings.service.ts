import { Injectable } from '@nestjs/common';
import { getDateRangeUpToMonthFromNow } from '../lib/date';
import { randomInt } from 'node:crypto';
import type {
  GetScreeningsParams,
  GetLastUpdatedParams,
  GetRecentScreeningsParams,
  LastUpdatedResponse,
  RecentScreeningResponse,
  Screening,
  ScreeningResponse,
  ScreeningGroupResponse,
  RandomScreeningResponse,
} from './screenings.types';
import type { CreateScreeningDto } from './dto/create-screening.dto';
import { mapScreening, mapScreeningGroup } from './screenings.mapper';
import { mapMovieHero, mapMovieSummary } from '../movies/movies.mapper';
import { ScreeningsRepository } from './screenings.repository';
import {
  RECENT_SCREENINGS_DEFAULT_DAYS,
  RECENT_SCREENINGS_DEFAULT_LIMIT,
  RETRO_YEAR_THRESHOLD,
} from './screenings.constants';
import { IndexNowService } from '../indexnow/indexnow.service';

@Injectable()
export class ScreeningsService {
  constructor(
    private readonly repo: ScreeningsRepository,
    private readonly indexNowService: IndexNowService,
  ) {}

  // === READ ===

  async getScreenings(
    params?: GetScreeningsParams,
  ): Promise<(ScreeningResponse | ScreeningGroupResponse)[]> {
    const { startDay, endDay } = getDateRangeUpToMonthFromNow(
      params?.dateFrom,
      params?.dateTo,
    );

    const movieIds = await this.repo.findFilteredMovieIds({
      startDay,
      endDay,
      movieId: params?.movieId,
      cityId: params?.cityId,
      citySlug: params?.citySlug,
      voivodeship: params?.voivodeship,
      cinemaId: params?.cinemaId,
      cinemaSlug: params?.cinemaSlug,
      genreId: params?.genreId,
      genreSlug: params?.genreSlug,
      directorId: params?.directorId,
      limit: params?.limit,
      search: params?.search,
    });

    if (movieIds.length === 0) return [];

    const movies = await this.repo.findMoviesWithScreenings(
      movieIds,
      startDay,
      endDay,
      {
        cityId: params?.cityId,
        citySlug: params?.citySlug,
        voivodeship: params?.voivodeship,
        cinemaId: params?.cinemaId,
        cinemaSlug: params?.cinemaSlug,
      },
    );

    const filtered = movies.filter(({ screenings }) => screenings.length > 0);

    if (params?.movieId) {
      return filtered.flatMap(({ screenings }) => screenings.map(mapScreening));
    }

    return filtered.map(({ screenings, ...movie }) =>
      mapScreeningGroup(movie, screenings),
    );
  }

  async getLastUpdatedAt(
    params?: GetLastUpdatedParams,
  ): Promise<LastUpdatedResponse> {
    const updatedAt = await this.repo.findLastUpdatedAt(params);
    return { updatedAt: updatedAt ? updatedAt.toISOString() : null };
  }

  /**
   * Films recently screened in a cinema or city and no longer scheduled
   * there, newest first.
   *
   * Backs the "Ostatnio w repertuarze" section: about two thirds of cinema
   * pages have no upcoming screenings at any given time and rendered as a
   * name, an address and boilerplate. The venue's recent programme is real,
   * per-page content that already sits in the database, because screenings
   * are upserted and never deleted.
   */
  async getRecentScreenings(
    params: GetRecentScreeningsParams = {},
  ): Promise<RecentScreeningResponse[]> {
    const days = params.days ?? RECENT_SCREENINGS_DEFAULT_DAYS;
    const limit = params.limit ?? RECENT_SCREENINGS_DEFAULT_LIMIT;

    // Day boundaries follow getDateRangeUpToMonthFromNow (server midnight):
    // screenings store wall-clock time as UTC, so this is local midnight.
    const until = new Date();
    until.setHours(0, 0, 0, 0);
    const since = new Date(until);
    since.setDate(since.getDate() - days);

    // Over-fetch so that dropping duplicates below still fills the limit.
    const stats = await this.repo.findRecentMovieStats({
      since,
      until,
      limit: limit * 2,
      cinemaId: params.cinemaId,
      cinemaSlug: params.cinemaSlug,
      cityId: params.cityId,
      citySlug: params.citySlug,
    });
    if (stats.length === 0) return [];

    const movieIds = stats.map((s) => s.movieId);
    // The default range is the one the movie page uses to decide noindex,
    // so hasUpcomingScreenings agrees with it by construction.
    const { startDay, endDay } = getDateRangeUpToMonthFromNow();
    const [movies, upcomingIds] = await Promise.all([
      this.repo.findMovieSummariesByIds(movieIds),
      this.repo.findMovieIdsWithScreeningsBetween(movieIds, startDay, endDay),
    ]);
    const moviesById = new Map(movies.map((m) => [m.id, m]));

    // The scraper sometimes creates a second row for a film it already has
    // (same title and year, slug suffixed "-2"), and both rows then carry
    // the same screenings. Grouping by movie id would list that film twice
    // with identical dates and counts. Keep the first occurrence, which is
    // the most recent because stats arrive sorted. Becomes a no-op once
    // duplicate movie rows are merged at the source.
    const seen = new Set<string>();
    const results: RecentScreeningResponse[] = [];
    for (const stat of stats) {
      if (results.length >= limit) break;
      const movie = moviesById.get(stat.movieId);
      if (!movie || !stat.lastScreeningDate) continue;
      const key = `${movie.title.trim().toLowerCase()}|${movie.productionYear}`;
      if (seen.has(key)) continue;
      seen.add(key);

      // ISO slice, not a Warsaw-zone conversion: the stored value is the
      // wall-clock time labelled UTC, and converting it would move a
      // 23:30 screening onto the next day. Matches screenings.mapper.
      const lastScreeningDate = new Date(stat.lastScreeningDate)
        .toISOString()
        .slice(0, 10);
      results.push({
        movie: mapMovieSummary(movie),
        lastScreeningDate,
        screeningsCount: Number(stat.screeningsCount),
        hasUpcomingScreenings: upcomingIds.has(stat.movieId),
      });
    }
    return results;
  }

  async getRandomRetroScreening(): Promise<RandomScreeningResponse | null> {
    const { startDay, endDay } = getDateRangeUpToMonthFromNow();

    const retroMovieIds =
      await this.repo.findRetroMovieIds(RETRO_YEAR_THRESHOLD);
    if (retroMovieIds.length === 0) return null;

    const candidateMovieIds = await this.repo.findCandidateRetroMovieIds(
      startDay,
      endDay,
      retroMovieIds,
    );
    if (candidateMovieIds.length === 0) return null;

    const chosenIndex = randomInt(0, candidateMovieIds.length);
    const chosenMovieId = candidateMovieIds[chosenIndex];

    const movie = await this.repo.findMovieWithScreeningsById(
      chosenMovieId,
      startDay,
      endDay,
    );

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
    const screening = await this.repo.insert(dto);

    // Screenings are the public-facing churn: new ones bump the effective
    // updatedAt of movie, cinema and city pages, so a debounced IndexNow
    // ping after a scrape run covers all of them.
    this.indexNowService.notifyContentChanged();

    return screening;
  }
}
