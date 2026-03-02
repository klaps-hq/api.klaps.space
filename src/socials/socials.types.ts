import type { Screening } from '../screenings/screenings.types';
import type { Movie } from '../movies/movies.types';

export type ScoredCandidate = {
  movieId: number;
  screeningId: number;
  score: number;
};

export type ScreeningWithCinemaCity = Screening & {
  cinema?: { city?: { id: number } } | null;
  movie?: (Movie & { movies_genres?: unknown[] }) | null;
};

export type CandidateByMovieSet = {
  screeningId: number;
  movieId: number;
  score: number;
};
