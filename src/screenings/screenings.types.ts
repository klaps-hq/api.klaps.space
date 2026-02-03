import { cinemas, movies, screenings } from '../database/schema/schema';

export type Screening = typeof screenings.$inferSelect;
export type ScreeningWithMovieAndCinema = Screening & {
  movie: typeof movies.$inferSelect;
  cinema: typeof cinemas.$inferSelect;
};

export type GetScreeningsParams = {
  date?: string;
  cityId?: number | undefined;
};
