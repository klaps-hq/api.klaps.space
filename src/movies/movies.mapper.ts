import type {
  MovieSummaryResponse,
  MovieHeroResponse,
  MovieResponse,
} from './movies.types';
import { mapGenre } from '../genres/genres.mapper';

type DbMovieWithGenres = {
  id: number;
  sourceId: number;
  slug: string;
  title: string;
  titleOriginal: string;
  description: string;
  productionYear: number;
  duration: number | null;
  language: string | null;
  posterUrl: string | null;
  backdropUrl?: string | null;
  videoUrl?: string | null;
  url: string;
  worldPremiereDate?: Date | string | null;
  polishPremiereDate?: Date | string | null;
  usersRating?: number | null;
  usersRatingVotes?: number | null;
  criticsRating?: number | null;
  criticsRatingVotes?: number | null;
  movies_genres: Array<{ genre: { id: number; slug: string; name: string } }>;
};

type DbMovieWithRelations = DbMovieWithGenres & {
  movies_actors: Array<{ actor: { id: number; name: string } }>;
  movies_directors: Array<{ director: { id: number; name: string } }>;
  movies_scriptwriters: Array<{ scriptwriter: { id: number; name: string } }>;
  movies_countries: Array<{ country: { id: number; name: string } }>;
};

export const mapMovieSummary = (
  movie: DbMovieWithGenres,
  updatedAt?: Date,
): MovieSummaryResponse => ({
  id: movie.id,
  sourceId: movie.sourceId,
  slug: movie.slug,
  url: movie.url,
  title: movie.title,
  titleOriginal: movie.titleOriginal || null,
  description: movie.description || null,
  productionYear: movie.productionYear,
  duration: movie.duration && movie.duration > 0 ? movie.duration : null,
  posterUrl: movie.posterUrl,
  videoUrl: movie.videoUrl ?? null,
  genres: movie.movies_genres.map((mg) => mapGenre(mg.genre)),
  ...(updatedAt !== undefined && { updatedAt: updatedAt.toISOString() }),
});

export const mapMovieHero = (movie: DbMovieWithGenres): MovieHeroResponse => ({
  ...mapMovieSummary(movie),
  backdropUrl: movie.backdropUrl ?? null,
});

const formatDateField = (
  value: Date | string | null | undefined,
): string | null => {
  if (!value) return null;
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  return String(value).slice(0, 10);
};

export const mapMovieDetail = (movie: DbMovieWithRelations): MovieResponse => ({
  id: movie.id,
  slug: movie.slug,
  title: movie.title,
  titleOriginal: movie.titleOriginal || null,
  description: movie.description || null,
  productionYear: movie.productionYear,
  duration: movie.duration && movie.duration > 0 ? movie.duration : null,
  language: movie.language || null,
  posterUrl: movie.posterUrl,
  backdropUrl: movie.backdropUrl ?? null,
  videoUrl: movie.videoUrl ?? null,
  worldPremiereDate: formatDateField(movie.worldPremiereDate),
  polishPremiereDate: formatDateField(movie.polishPremiereDate),
  genres: movie.movies_genres.map((mg) => mapGenre(mg.genre)),
  actors: movie.movies_actors.map(({ actor: { id, name } }) => ({ id, name })),
  directors: movie.movies_directors.map(({ director: { id, name } }) => ({
    id,
    name,
  })),
  scriptwriters: movie.movies_scriptwriters.map(
    ({ scriptwriter: { id, name } }) => ({ id, name }),
  ),
  countries: movie.movies_countries.map(({ country: { id, name } }) => ({
    id,
    name,
  })),
  ratings: {
    users:
      movie.usersRating != null && movie.usersRatingVotes != null
        ? { score: movie.usersRating, votes: movie.usersRatingVotes }
        : null,
    critics:
      movie.criticsRating != null && movie.criticsRatingVotes != null
        ? { score: movie.criticsRating, votes: movie.criticsRatingVotes }
        : null,
  },
  filmwebUrl: movie.url,
});
