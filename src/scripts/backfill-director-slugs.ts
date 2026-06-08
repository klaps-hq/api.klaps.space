/**
 * One-time backfill script that populates the `slug` column for existing rows
 * in the `directors` table. New directors get their slug on insert
 * (see MoviesRepository.upsertDirectors); this fills rows created before the
 * column existed.
 *
 * Usage: bunx ts-node -r dotenv/config src/scripts/backfill-director-slugs.ts
 */
import 'dotenv/config';
import { Client, type QueryResultRow } from 'pg';
import { toSlug, uniqueSlug } from '../lib/slug';

const run = async () => {
  const client = new Client(process.env.DATABASE_URL);
  await client.connect();

  try {
    const { rows } = await client.query<QueryResultRow>(
      `SELECT id, name FROM directors WHERE slug IS NULL OR slug = '' ORDER BY id`,
    );

    if (rows.length === 0) {
      console.log('directors: nothing to backfill');
      return;
    }

    const { rows: existing } = await client.query<QueryResultRow>(
      `SELECT slug FROM directors WHERE slug IS NOT NULL AND slug != ''`,
    );
    const taken = new Set<string>(existing.map((r) => r.slug as string));

    let updated = 0;
    for (const row of rows) {
      const slug = uniqueSlug(toSlug(row.name as string), taken);
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
