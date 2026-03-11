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

export type SocialsGetCandidateResponse = {
  publish: boolean;
  date: { from: string; to: string };
  reason:
    | 'HAS_HIGH_QUALITY_CANDIDATE'
    | 'NO_HIGH_QUALITY_CANDIDATE'
    | 'NO_SCREENINGS_IN_RANGE'
    | 'ALREADY_PUBLISHED';
  meta: {
    candidatesChecked: number;
    bestScore: number | null;
    minScore: number;
  };
  candidates: ScreeningWithCinemaCity[];
};
