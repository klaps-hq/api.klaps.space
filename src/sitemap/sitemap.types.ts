export type SitemapEntry = {
  slug: string;
  /** ISO 8601 UTC; omitted when there is no reliable date for the resource. */
  updatedAt?: string;
};

export type SitemapResponse = {
  movies: SitemapEntry[];
  cinemas: SitemapEntry[];
  /** Only cities with at least one cinema. */
  cities: SitemapEntry[];
  genres: SitemapEntry[];
};
