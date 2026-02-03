import { genres, movies } from '../database/schema/schema';

export type Movie = typeof movies.$inferSelect;
export type Genre = typeof genres.$inferSelect;

export type MovieWithGenres = Movie & {
  movies_genres: Array<{ genre: Genre }>;
};
