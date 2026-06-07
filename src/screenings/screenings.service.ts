import { Injectable } from '@nestjs/common';
import { getDateRangeUpToMonthFromNow } from '../lib/date';
import { randomInt } from 'node:crypto';
import type {
  GetScreeningsParams,
  Screening,
  ScreeningResponse,
  ScreeningGroupResponse,
  RandomScreeningResponse,
} from './screenings.types';
import type { CreateScreeningDto } from './dto/create-screening.dto';
import { mapScreening, mapScreeningGroup } from './screenings.mapper';
import { mapMovieHero } from '../movies/movies.mapper';
import { ScreeningsRepository } from './screenings.repository';
import { RETRO_YEAR_THRESHOLD } from './screenings.constants';
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
