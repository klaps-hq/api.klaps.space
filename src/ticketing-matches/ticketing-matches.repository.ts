import { Inject, Injectable } from '@nestjs/common';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { and, desc, eq, isNull, lte, sql, type SQL } from 'drizzle-orm';
import * as schema from '../database/schemas';
import { DRIZZLE } from '../database/constants';
import type {
  NewTicketingMatchRow,
  TicketingMatchRow,
} from '../database/schemas/ticketing_matches.schema';
import type { REVIEW_FILTERS } from './dto/ticketing-matches.dto';

const t = schema.ticketing_matches;
const UPSERT_CHUNK = 500;

@Injectable()
export class TicketingMatchesRepository {
  constructor(
    @Inject(DRIZZLE)
    private readonly db: NodePgDatabase<typeof schema>,
  ) {}

  findAll(
    review?: (typeof REVIEW_FILTERS)[number],
    retroYear?: number,
  ): Promise<TicketingMatchRow[]> {
    const filters: Record<string, SQL | undefined> = {
      unresolved: and(eq(t.status, 'unresolved'), eq(t.manual, false)),
      // Retro picks the model made without the year in the event name: the
      // kind that once turned "Lalka" (2026) into the 1968 film.
      suspicious: and(
        eq(t.status, 'matched'),
        eq(t.manual, false),
        isNull(t.reviewedAt),
        lte(t.year, retroYear ?? 0),
        sql`(${t.method} in ('ai', 'tmdb-wikidata') or ${t.note} like 'via AI%')`,
        sql`${t.rawTitle} !~ '(19|20)[0-9]{2}'`,
      ),
      manual: eq(t.manual, true),
    };
    return this.db
      .select()
      .from(t)
      .where(review ? filters[review] : undefined)
      .orderBy(desc(t.screenings), t.key);
  }

  findByKey(key: string): Promise<TicketingMatchRow | undefined> {
    return this.db
      .select()
      .from(t)
      .where(eq(t.key, key))
      .then((rows) => rows[0]);
  }

  /**
   * Saves the scraper's matches. A manual row keeps its result: only the
   * run's cinemas, counts and title are refreshed.
   */
  async upsertMany(rows: NewTicketingMatchRow[]): Promise<void> {
    for (let i = 0; i < rows.length; i += UPSERT_CHUNK) {
      await this.db
        .insert(t)
        .values(rows.slice(i, i + UPSERT_CHUNK))
        .onConflictDoUpdate({
          target: t.key,
          set: {
            rawTitle: sql`excluded."rawTitle"`,
            cinemas: sql`excluded."cinemas"`,
            screenings: sql`excluded."screenings"`,
            lastSeenAt: sql`excluded."lastSeenAt"`,
            status: sql`case when ${t.manual} then ${t.status} else excluded."status" end`,
            filmwebId: sql`case when ${t.manual} then ${t.filmwebId} else excluded."filmwebId" end`,
            title: sql`case when ${t.manual} then ${t.title} else excluded."title" end`,
            year: sql`case when ${t.manual} then ${t.year} else excluded."year" end`,
            method: sql`case when ${t.manual} then ${t.method} else excluded."method" end`,
            confidence: sql`case when ${t.manual} then ${t.confidence} else excluded."confidence" end`,
            note: sql`case when ${t.manual} then ${t.note} else excluded."note" end`,
            result: sql`case when ${t.manual} then ${t.result} else excluded."result" end`,
            checkedAt: sql`case when ${t.manual} then ${t.checkedAt} else excluded."checkedAt" end`,
            // A new result for an earlier reviewed row needs a new review.
            reviewedAt: sql`case when ${t.manual} or ${t.filmwebId} is not distinct from excluded."filmwebId" then ${t.reviewedAt} else null end`,
          },
        });
    }
  }

  async update(
    key: string,
    set: Partial<NewTicketingMatchRow>,
  ): Promise<TicketingMatchRow | undefined> {
    const [row] = await this.db
      .update(t)
      .set(set)
      .where(eq(t.key, key))
      .returning();
    return row;
  }
}
