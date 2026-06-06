export type SitemapEntry = {
  slug: string;
  /** ISO 8601 UTC; ostatnia zauważalna zmiana treści (zasób lub powiązane seanse). */
  updatedAt?: string;
};

export type SitemapResponse = {
  movies: SitemapEntry[];
  cinemas: SitemapEntry[];
  cities: SitemapEntry[];
  genres: SitemapEntry[];
};
