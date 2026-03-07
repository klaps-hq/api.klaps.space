/**
 * One-time repair script that fixes slugs that got incremented (e.g. -2, -3)
 * due to the upsert bug where slug was regenerated on every sync.
 *
 * For each table it:
 *  1. Fetches all rows ordered by id (insertion order = priority).
 *  2. Recomputes what the canonical slug should be for each row.
 *  3. Assigns unique slugs so the oldest record always wins the base slug,
 *     newer duplicates get -2, -3 … only when there is a genuine name conflict.
 *  4. Updates only rows whose slug changed.
 *
 * Usage: npx ts-node -r dotenv/config src/scripts/fix-duplicate-slugs.ts
 */
import 'dotenv/config';
import { createConnection } from 'mysql2/promise';
import type { RowDataPacket } from 'mysql2';
import { toSlug, movieSlug } from '../lib/slug';

interface NamedRow extends RowDataPacket {
  id: number;
  slug: string;
  name: string;
}

interface MovieRow extends RowDataPacket {
  id: number;
  slug: string;
  title: string;
  productionYear: number;
}

type DbConnection = Awaited<ReturnType<typeof createConnection>>;

const assignUniqueSlugs = (
  rows: { id: number; slug: string; baseSlug: string }[],
): Map<number, string> => {
  const result = new Map<number, string>();
  const taken = new Set<string>();

  for (const row of rows) {
    let candidate = row.baseSlug;
    if (taken.has(candidate)) {
      let i = 2;
      while (taken.has(`${candidate}-${i}`)) i++;
      candidate = `${candidate}-${i}`;
    }
    taken.add(candidate);
    result.set(row.id, candidate);
  }

  return result;
};

const fixNamedTable = async (connection: DbConnection, table: string) => {
  const [rows] = await connection.execute<NamedRow[]>(
    `SELECT id, slug, name FROM \`${table}\` ORDER BY id ASC`,
  );

  if (rows.length === 0) {
    console.log(`  ${table}: empty, skipping`);
    return;
  }

  const withBase = rows.map((r) => ({
    id: r.id,
    slug: r.slug,
    baseSlug: toSlug(r.name),
  }));

  const assigned = assignUniqueSlugs(withBase);

  let updated = 0;
  for (const row of withBase) {
    const newSlug = assigned.get(row.id)!;
    if (newSlug === row.slug) continue;
    await connection.execute(
      `UPDATE \`${table}\` SET slug = ? WHERE id = ?`,
      [newSlug, row.id],
    );
    console.log(`    [${table}] id=${row.id}: "${row.slug}" → "${newSlug}"`);
    updated++;
  }

  console.log(`  ${table}: ${updated} row(s) fixed`);
};

const fixMovies = async (connection: DbConnection) => {
  const [rows] = await connection.execute<MovieRow[]>(
    `SELECT id, slug, title, productionYear FROM movies ORDER BY id ASC`,
  );

  if (rows.length === 0) {
    console.log('  movies: empty, skipping');
    return;
  }

  const withBase = rows.map((r) => ({
    id: r.id,
    slug: r.slug,
    baseSlug: movieSlug(r.title, r.productionYear),
  }));

  const assigned = assignUniqueSlugs(withBase);

  let updated = 0;
  for (const row of withBase) {
    const newSlug = assigned.get(row.id)!;
    if (newSlug === row.slug) continue;
    await connection.execute(`UPDATE movies SET slug = ? WHERE id = ?`, [
      newSlug,
      row.id,
    ]);
    console.log(`    [movies] id=${row.id}: "${row.slug}" → "${newSlug}"`);
    updated++;
  }

  console.log(`  movies: ${updated} row(s) fixed`);
};

const run = async () => {
  const connection = await createConnection(process.env.DATABASE_URL!);
  try {
    console.log('Fixing duplicate slugs...\n');
    await fixNamedTable(connection, 'cities');
    await fixNamedTable(connection, 'genres');
    await fixNamedTable(connection, 'cinemas');
    await fixMovies(connection);
    console.log('\nDone.');
  } finally {
    await connection.end();
  }
};

run().catch((err: unknown) => {
  console.error('Script failed:', err);
  process.exit(1);
});
