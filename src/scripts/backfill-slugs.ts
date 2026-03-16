/**
 * One-time backfill script that populates the `slug` column for all existing
 * rows in movies, cinemas, cities, and genres tables.
 *
 * Usage: bunx ts-node -r dotenv/config src/scripts/backfill-slugs.ts
 */
import 'dotenv/config';
import { Client, type QueryResultRow } from 'pg';
import { toSlug, movieSlug, uniqueSlug } from '../lib/slug';

interface Row {
  id: number;
  name?: string;
  title?: string;
  productionYear?: number;
}

const run = async () => {
  const client = new Client(process.env.DATABASE_URL);
  await client.connect();

  try {
    await backfillTable(client, 'cities', (row: Row) => toSlug(row.name!));
    await backfillTable(client, 'genres', (row: Row) => toSlug(row.name!));
    await backfillTable(client, 'cinemas', (row: Row) => toSlug(row.name!));
    await backfillMovies(client);

    console.log('\nSlug backfill complete.');
  } finally {
    await client.end();
  }
};

const hasColumn = async (
  client: Client,
  table: string,
  column: string,
): Promise<boolean> => {
  const { rows } = await client.query(
    `SELECT column_name FROM information_schema.columns WHERE table_name = $1 AND column_name = $2`,
    [table, column],
  );
  return rows.length > 0;
};

const backfillTable = async (
  client: Client,
  table: string,
  slugFn: (row: Row) => string,
) => {
  if (!(await hasColumn(client, table, 'slug'))) {
    console.log(`  ${table}: skipped (missing slug column)`);
    return;
  }

  const { rows } = await client.query<QueryResultRow>(
    `SELECT id, name FROM "${table}" WHERE slug IS NULL OR slug = ''`,
  );

  if (rows.length === 0) {
    console.log(`  ${table}: nothing to backfill`);
    return;
  }

  const taken = new Set<string>();
  const { rows: existing } = await client.query<QueryResultRow>(
    `SELECT slug FROM "${table}" WHERE slug IS NOT NULL AND slug != ''`,
  );
  for (const r of existing) taken.add(r.slug as string);

  let updated = 0;
  for (const row of rows) {
    const base = slugFn(row as Row);
    const slug = uniqueSlug(base, taken);
    taken.add(slug);
    await client.query(`UPDATE "${table}" SET slug = $1 WHERE id = $2`, [
      slug,
      row.id,
    ]);
    updated++;
  }

  console.log(`  ${table}: ${updated} row(s) updated`);
};

const backfillMovies = async (client: Client) => {
  if (!(await hasColumn(client, 'movies', 'slug'))) {
    console.log('  movies: skipped (missing slug column)');
    return;
  }

  const { rows } = await client.query<QueryResultRow>(
    `SELECT id, title, "productionYear" FROM movies WHERE slug IS NULL OR slug = ''`,
  );

  if (rows.length === 0) {
    console.log('  movies: nothing to backfill');
    return;
  }

  const taken = new Set<string>();
  const { rows: existing } = await client.query<QueryResultRow>(
    `SELECT slug FROM movies WHERE slug IS NOT NULL AND slug != ''`,
  );
  for (const r of existing) taken.add(r.slug as string);

  let updated = 0;
  for (const row of rows) {
    const base = movieSlug(row.title as string, row.productionYear as number);
    const slug = uniqueSlug(base, taken);
    taken.add(slug);
    await client.query(`UPDATE movies SET slug = $1 WHERE id = $2`, [
      slug,
      row.id,
    ]);
    updated++;
  }

  console.log(`  movies: ${updated} row(s) updated`);
};

run().catch((err) => {
  console.error('Backfill failed:', err);
  process.exit(1);
});
