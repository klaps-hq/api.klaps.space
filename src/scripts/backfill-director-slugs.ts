/**
 * One-time backfill / repair script for the `slug` column on `directors`.
 * Fills NULL/empty slugs created before the column existed, and repairs
 * "broken" slugs that came from names with no transliterable [a-z0-9]
 * characters (CJK / Cyrillic / Arabic / Greek …) - those collapse to an empty
 * base and end up as '' or '-2', '-3', …. directorSlug() falls back to a
 * stable `rezyser-<sourceId>` for them.
 *
 * New directors get their slug on insert (MoviesRepository.upsertDirectors);
 * this only touches rows that are missing or broken. Idempotent.
 *
 * Usage: bunx ts-node -r dotenv/config src/scripts/backfill-director-slugs.ts
 */
import 'dotenv/config';
import { Client, type QueryResultRow } from 'pg';
import { directorSlug, uniqueSlug } from '../lib/slug';

/** Good slugs always contain a letter and never start with '-'. */
const BROKEN_SLUG = `slug IS NULL OR slug = '' OR slug LIKE '-%'`;

const run = async () => {
  const client = new Client(process.env.DATABASE_URL);
  await client.connect();

  try {
    const { rows } = await client.query<QueryResultRow>(
      `SELECT id, name, "sourceId" FROM directors WHERE ${BROKEN_SLUG} ORDER BY id`,
    );

    if (rows.length === 0) {
      console.log('directors: nothing to backfill');
      return;
    }

    const { rows: existing } = await client.query<QueryResultRow>(
      `SELECT slug FROM directors WHERE NOT (${BROKEN_SLUG})`,
    );
    const taken = new Set<string>(existing.map((r) => r.slug as string));

    let updated = 0;
    for (const row of rows) {
      const slug = uniqueSlug(
        directorSlug(row.name as string, row.sourceId as number),
        taken,
      );
      taken.add(slug);
      await client.query(`UPDATE directors SET slug = $1 WHERE id = $2`, [
        slug,
        row.id,
      ]);
      updated++;
    }

    console.log(`directors: ${updated} row(s) updated`);
  } finally {
    await client.end();
  }
};

run().catch((err) => {
  console.error('Backfill failed:', err);
  process.exit(1);
});
