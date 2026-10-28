export type LandingIntroResponse = {
  key: string;
  content: string;
  /** ISO 8601 UTC of the last write; the scraper refreshes stale intros. */
  updatedAt: string;
};
