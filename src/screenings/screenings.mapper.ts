import type {
  ScreeningResponse,
  ScreeningGroupResponse,
} from './screenings.types';
import { mapCinemaSummary } from '../cinemas/cinemas.mapper';
import { mapMovieSummary } from '../movies/movies.mapper';
import type { SpecialType } from '../database/schemas/series.schema';

type ScreeningInput = {
  id: number;
  url: string | null;
  date: Date;
  type: string;
  isDubbing: boolean | number;
  isSubtitled: boolean | number;
  specialType?: SpecialType | null;
  specialLabel?: string | null;
  editionNote?: string | null;
  seriesId?: number | null;
  series?: { slug: string } | null;
  cinema?: Parameters<typeof mapCinemaSummary>[0] | null;
};

const EMPTY_CINEMA = {
  id: 0,
  sourceId: 0,
  slug: '',
  name: '',
  street: null,
  description: null,
  city: {
    id: 0,
    slug: '',
    name: '',
    nameDeclinated: '',
    population: null,
    description: null,
    voivodeship: null,
  },
  isOpenAir: false,
} as const;

const extractDateTimeParts = (
  dt: Date,
): { date: string; time: string; dateTime: string } => {
  const iso = dt instanceof Date ? dt.toISOString() : String(dt);
  const dateStr = iso.slice(0, 10);
  const timeStr = iso.slice(11, 16);
  return {
    date: dateStr,
    time: timeStr,
    dateTime: `${dateStr}T${iso.slice(11, 19)}Z`,
  };
};

export const mapScreening = (screening: ScreeningInput): ScreeningResponse => {
  const { date, time, dateTime } = extractDateTimeParts(screening.date);
  return {
    id: screening.id,
    date,
    time,
    dateTime,
    type: screening.type,
    ticketUrl: screening.url ?? null,
    isDubbing: Boolean(screening.isDubbing),
    isSubtitled: Boolean(screening.isSubtitled),
    specialType: screening.specialType ?? null,
    specialLabel: screening.specialLabel ?? null,
    editionNote: screening.editionNote ?? null,
    seriesId: screening.seriesId ?? null,
    seriesSlug: screening.series?.slug ?? null,
    cinema: screening.cinema
      ? mapCinemaSummary(screening.cinema)
      : EMPTY_CINEMA,
  };
};

export const mapScreeningGroup = (
  movie: Parameters<typeof mapMovieSummary>[0],
  screenings: ScreeningInput[],
): ScreeningGroupResponse => {
  const mapped = screenings.map(mapScreening);
  const uniqueCinemas = new Set(mapped.map((s) => s.cinema.id));
  const uniqueCities = new Map<number, string>();
  for (const s of mapped) {
    if (s.cinema.city.id > 0) {
      uniqueCities.set(s.cinema.city.id, s.cinema.city.name);
    }
  }
  return {
    movie: mapMovieSummary(movie),
    summary: {
      screeningsCount: mapped.length,
      cinemasCount: uniqueCinemas.size,
      citiesCount: uniqueCities.size,
      cities: [...uniqueCities.values()],
    },
    screenings: mapped,
  };
};
