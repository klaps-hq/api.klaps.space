import { cinemas, screenings } from '../database/schema/schema';
import type { MovieWithGenres } from '../movies/movies.types';

export type Screening = typeof screenings.$inferSelect;
export type ScreeningWithMovie = Screening & {
  movie: MovieWithGenres;
};
export type ScreeningWithMovieAndCinema = Screening & {
  movie: MovieWithGenres;
  cinema: typeof cinemas.$inferSelect;
};

export type ScreeningWithStartTime = Screening & {
  startTime: string;
  cinemaName: string;
};

export type MovieWithScreenings = {
  movie: MovieWithGenres;
  screenings: ScreeningWithStartTime[];
};

export type GetScreeningsParams = {
  dateFrom?: string;
  dateTo?: string;
  cityId?: number | undefined;
  genreId?: number | undefined;
  limit?: number;
};
