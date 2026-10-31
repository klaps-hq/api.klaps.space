import { Injectable, NotFoundException } from '@nestjs/common';
import { getNowInPolandWallClock, getTodayInPoland } from '../lib/date';
import { toSlug } from '../lib/slug';
import { mapMovieSummary } from '../movies/movies.mapper';
import { ScreeningsService } from '../screenings/screenings.service';
import type { ScreeningGroupResponse } from '../screenings/screenings.types';
import type { Series } from '../database/schemas/series.schema';
import { SeriesRepository, type SeriesCounts } from './series.repository';
import type { UpdateSeriesDto } from './dto/update-series.dto';
import type { SeriesDetailResponse, SeriesResponse } from './series.types';

export const SERIES_PAST_DAYS = 180;
const PAST_MOVIES_LIMIT = 60;

const EMPTY_COUNTS: Omit<SeriesCounts, 'seriesId'> = {
  upcomingCount: 0,
  upcomingVenues: 0,
  upcomingCities: 0,
  independentUpcomingCount: 0,
  pastCount: 0,
  lastScreeningAddedAt: null,
};

const toResponse = (
  series: Series,
  counts: Omit<SeriesCounts, 'seriesId'> = EMPTY_COUNTS,
): SeriesResponse => ({
  id: series.id,
  slug: series.slug,
  name: series.name,
  type: series.type,
  organizer: series.organizer,
  isChainProgramme: series.isChainProgramme,
  description: series.description,
  firstSeenAt: series.firstSeenAt.toISOString(),
  lastSeenAt: series.lastSeenAt.toISOString(),
  upcomingCount: counts.upcomingCount,
  upcomingVenues: counts.upcomingVenues,
  upcomingCities: counts.upcomingCities,
  independentUpcomingCount: counts.independentUpcomingCount,
  pastCount: counts.pastCount,
  lastScreeningAddedAt: counts.lastScreeningAddedAt?.toISOString() ?? null,
});

@Injectable()
export class SeriesService {
  constructor(
    private readonly repo: SeriesRepository,
    private readonly screeningsService: ScreeningsService,
  ) {}

  private window() {
    const now = getNowInPolandWallClock();
    const since = new Date(now.getTime() - SERIES_PAST_DAYS * 86_400_000);
    return { now, since };
  }

  async getSeries(): Promise<SeriesResponse[]> {
    const { now, since } = this.window();
    const [series, counts] = await Promise.all([
      this.repo.findAll(),
      this.repo.countScreenings(now, since),
    ]);
    const bySeries = new Map(counts.map((c) => [c.seriesId, c]));
    return series.map((s) => toResponse(s, bySeries.get(s.id)));
  }

  async getSeriesBySlug(slug: string): Promise<SeriesDetailResponse> {
    const series = await this.repo.findBySlug(slug);
    if (!series) throw new NotFoundException(`Series "${slug}" not found`);
    const { now, since } = this.window();
    const [[counts], screenings, past] = await Promise.all([
      this.repo.countScreenings(now, since, [series.id]),
      this.screeningsService.getScreenings({
        seriesSlug: slug,
        dateFrom: getTodayInPoland(),
      }) as Promise<ScreeningGroupResponse[]>,
      this.repo.findPastMovies(series.id, since, now, PAST_MOVIES_LIMIT),
    ]);
    return {
      ...toResponse(series, counts),
      screenings,
      pastMovies: past.map((p) => ({
        movie: mapMovieSummary(p.movie),
        lastScreeningDate: p.lastScreening.toISOString().slice(0, 10),
        screeningsCount: p.screeningsCount,
      })),
    };
  }

  async updateSeries(
    slug: string,
    dto: UpdateSeriesDto,
  ): Promise<SeriesResponse> {
    const series = await this.repo.findBySlug(slug);
    if (!series) throw new NotFoundException(`Series "${slug}" not found`);
    const { aliases, ...set } = dto;
    const updated = Object.keys(set).length
      ? await this.repo.update(series.id, set)
      : series;
    if (aliases) {
      await this.repo.addAliases(series.id, [
        ...new Set(aliases.map(toSlug).filter(Boolean)),
      ]);
    }
    const { now, since } = this.window();
    const [counts] = await this.repo.countScreenings(now, since, [series.id]);
    return toResponse(updated!, counts);
  }
}
