import type { Showtime, ShowtimeResponse } from './showtimes.types';

export const mapShowtime = (showtime: Showtime): ShowtimeResponse => ({
  id: showtime.id,
  url: showtime.url,
  cityId: showtime.cityId,
  date: showtime.date,
});
