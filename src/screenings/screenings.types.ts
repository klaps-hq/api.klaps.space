import { cinemasTable } from '../database/schemas/cinemas.schema';
import { screeningsTable } from '../database/schemas/screenings.schema';
import type { MovieWithGenres } from '../movies/movies.types';

export type Screening = typeof screeningsTable.$inferSelect;
export type ScreeningWithMovie = Screening & {
  movie: MovieWithGenres;
};
export type ScreeningWithMovieAndCinema = Screening & {
  movie: MovieWithGenres;
  cinema: typeof cinemasTable.$inferSelect;
};

export type ScreeningWithStartTime = Screening & {
  startTime: Date;
  cinemaName: string;
};

export type MovieWithScreenings = {
  movie: MovieWithGenres;
  screenings: ScreeningWithStartTime[];
};

export type GetScreeningsParams = {
  dateFrom?: string;
  dateTo?: string;
  movieId?: number;
  cityId?: number | undefined;
  genreId?: number | undefined;
  limit?: number;
};
