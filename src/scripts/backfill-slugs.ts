/**
 * One-time backfill script that populates the `slug` column for all existing
 * rows in movies, cinemas, cities, and genres tables.
 *
 * Usage: npx ts-node -r dotenv/config src/scripts/backfill-slugs.ts
 */
import 'dotenv/config';
import { createConnection } from 'mysql2/promise';
import type { RowDataPacket } from 'mysql2';
import { toSlug, movieSlug, uniqueSlug } from '../lib/slug';

interface Row {
  id: number;
  name?: string;
  title?: string;
  productionYear?: number;
}

interface SlugRow extends RowDataPacket {
  slug: string;
}

interface NamedRow extends RowDataPacket {
  id: number;
  name: string;
}

interface MovieRow extends RowDataPacket {
  id: number;
  title: string;
  productionYear: number;
}

type DbConnection = Awaited<ReturnType<typeof createConnection>>;

interface ColumnRow extends RowDataPacket {
  Field: string;
}

const run = async () => {
  const connection = await createConnection(process.env.DATABASE_URL!);

  try {
    await backfillTable(connection, 'cities', (row: Row) => toSlug(row.name!));
    await backfillTable(connection, 'genres', (row: Row) => toSlug(row.name!));
    await backfillTable(connection, 'cinemas', (row: Row) => toSlug(row.name!));
    await backfillMovies(connection);

    console.log('\nSlug backfill complete.');
  } finally {
    await connection.end();
  }
};

const hasColumn = async (
  connection: DbConnection,
  table: string,
  column: string,
): Promise<boolean> => {
  const [rows] = await connection.execute<ColumnRow[]>(
    `SHOW COLUMNS FROM \`${table}\` WHERE Field = ?`,
    [column],
  );
  return rows.length > 0;
};

const backfillTable = async (
  connection: DbConnection,
  table: string,
  slugFn: (row: Row) => string,
) => {
  if (!(await hasColumn(connection, table, 'slug'))) {
    console.log(`  ${table}: skipped (missing slug column)`);
    return;
  }

  const [rows] = await connection.execute<NamedRow[]>(
    `SELECT id, name FROM \`${table}\` WHERE slug IS NULL OR slug = ''`,
  );

  if (rows.length === 0) {
    console.log(`  ${table}: nothing to backfill`);
    return;
  }

  const taken = new Set<string>();
  const [existing] = await connection.execute<SlugRow[]>(
    `SELECT slug FROM \`${table}\` WHERE slug IS NOT NULL AND slug != ''`,
  );
  for (const r of existing) taken.add(r.slug);

  let updated = 0;
  for (const row of rows) {
    const base = slugFn(row);
    const slug = uniqueSlug(base, taken);
    taken.add(slug);
    await connection.execute(`UPDATE \`${table}\` SET slug = ? WHERE id = ?`, [
      slug,
      row.id,
    ]);
    updated++;
  }

  console.log(`  ${table}: ${updated} row(s) updated`);
};

const backfillMovies = async (connection: DbConnection) => {
  if (!(await hasColumn(connection, 'movies', 'slug'))) {
    console.log('  movies: skipped (missing slug column)');
    return;
  }

  const [rows] = await connection.execute<MovieRow[]>(
    `SELECT id, title, productionYear FROM movies WHERE slug IS NULL OR slug = ''`,
  );

  if (rows.length === 0) {
    console.log('  movies: nothing to backfill');
    return;
  }

  const taken = new Set<string>();
  const [existing] = await connection.execute<SlugRow[]>(
    `SELECT slug FROM movies WHERE slug IS NOT NULL AND slug != ''`,
  );
  for (const r of existing) taken.add(r.slug);

  let updated = 0;
  for (const row of rows) {
    const base = movieSlug(row.title, row.productionYear);
    const slug = uniqueSlug(base, taken);
    taken.add(slug);
    await connection.execute(`UPDATE movies SET slug = ? WHERE id = ?`, [
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
