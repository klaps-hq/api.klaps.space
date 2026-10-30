import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { CinemasRepository, type CinemaLinkColumn } from './cinemas.repository';
import { checkLink } from './link-check';

const CONCURRENCY = 5;
// A dead link is checked once more after this pause, so a site that was
// down for a moment during the first pass keeps its link.
const RECHECK_DELAY_MS = 10 * 60 * 1000;

interface LinkCandidate {
  id: number;
  slug: string;
  column: CinemaLinkColumn;
  url: string;
}

const LINK_COLUMNS: CinemaLinkColumn[] = [
  'website',
  'repertoireUrl',
  'bookingUrl',
  'operatorUrl',
];

const sleep = (ms: number) =>
  new Promise<void>((resolve) => setTimeout(resolve, ms));

/**
 * Monthly cleanup of outbound cinema links: the researched booking and
 * repertoire pages go stale as cinemas change ticketing providers or
 * rebuild their sites. A link confirmed dead twice is cleared, so the
 * cinema page hides it instead of sending visitors to a 404.
 */
@Injectable()
export class CinemaLinkCheckService {
  private readonly logger = new Logger(CinemaLinkCheckService.name);
  private running = false;

  constructor(private readonly repo: CinemasRepository) {}

  // First day of the month, early morning Polish time, away from the
  // scraper runs.
  @Cron('30 4 1 * *', {
    name: 'cinema-link-check',
    timeZone: 'Europe/Warsaw',
  })
  async run(): Promise<void> {
    if (this.running) return;
    this.running = true;
    try {
      const candidates = (await this.repo.findCinemaLinks()).flatMap((row) =>
        LINK_COLUMNS.filter((column) => row[column]).map((column) => ({
          id: row.id,
          slug: row.slug,
          column,
          url: row[column] as string,
        })),
      );

      const suspects = await this.findDead(candidates);
      if (suspects.length > 0) await sleep(RECHECK_DELAY_MS);
      const dead = await this.findDead(suspects);

      for (const link of dead) {
        await this.repo.clearCinemaLink(link.id, link.column, link.url);
        this.logger.log(
          `Cleared dead ${link.column} of ${link.slug}: ${link.url}`,
        );
      }
      this.logger.log(
        `Checked ${candidates.length} cinema links, cleared ${dead.length}.`,
      );
    } catch (error) {
      this.logger.error('Cinema link check failed', error as Error);
    } finally {
      this.running = false;
    }
  }

  private async findDead(links: LinkCandidate[]): Promise<LinkCandidate[]> {
    const dead: LinkCandidate[] = [];
    for (let i = 0; i < links.length; i += CONCURRENCY) {
      const chunk = links.slice(i, i + CONCURRENCY);
      const statuses = await Promise.all(
        chunk.map((link) => checkLink(link.url)),
      );
      chunk.forEach((link, index) => {
        if (statuses[index] === 'dead') dead.push(link);
      });
    }
    return dead;
  }
}
