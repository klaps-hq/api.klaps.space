export type TicketingMatchResponse = {
  /** "provider:externalFilmId" */
  key: string;
  provider: string;
  rawTitle: string;
  status: 'matched' | 'event' | 'not-film' | 'unresolved';
  filmwebId: number | null;
  title: string | null;
  year: number | null;
  method: string | null;
  confidence: number | null;
  note: string | null;
  /** The scraper's MatchResult; `candidates` lists "Title (year) #filmwebId". */
  result: Record<string, unknown>;
  /** Set in the panel; the scraper keeps it as it is. */
  manual: boolean;
  reviewedAt: string | null;
  /** Filmweb cinema ids and screening count from the latest run. */
  cinemas: number[];
  screenings: number;
  checkedAt: string;
  lastSeenAt: string;
};
