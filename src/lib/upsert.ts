import { sql } from 'drizzle-orm';
import type { SQL } from 'drizzle-orm';
import type { PgColumn } from 'drizzle-orm/pg-core';

/**
 * Builds a `setWhere` condition for `onConflictDoUpdate` that is true only
 * when any of the given columns would actually change. Lets upserts bump
 * `updatedAt` exclusively on real content changes — re-scrapes with
 * identical data skip the update entirely.
 */
export const excludedChanged = (columns: PgColumn[]): SQL => {
  const current = sql.join(
    columns.map((c) => sql`${c}`),
    sql`, `,
  );
  const excluded = sql.join(
    columns.map((c) => sql.raw(`excluded."${c.name}"`)),
    sql`, `,
  );
  return sql`(${current}) IS DISTINCT FROM (${excluded})`;
};
