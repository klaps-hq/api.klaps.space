/**
 * Backfill of `cinemas.isOpenAir` from the cinema name, for cinemas that
 * existed before the column. New cinemas get the flag on insert.
 *
 * Dry run by default: prints every cinema whose flag would change and rolls
 * back. Pass --apply to write. Only flips false -> true and does not know
 * about manual corrections, so after a venue was unflagged by hand
 * (POST /cinemas/:slug { "isOpenAir": false }) review the list before
 * applying again.
 *
 * Usage: bun run db:backfill-open-air-cinemas [--apply]
 */
import 'dotenv/config';
import { Client } from 'pg';
import { isOpenAirCinemaName } from '../cinemas/open-air';

interface CinemaRow {
  id: number;
  slug: string;
  name: string;
  city: string | null;
}

const run = async (apply: boolean) => {
  const client = new Client(process.env.DATABASE_URL);
  await client.connect();

  try {
    const { rows } = await client.query<CinemaRow>(
      `SELECT c.id, c.slug, c.name, ci.name AS city
         FROM cinemas c
         LEFT JOIN cities ci ON ci."sourceId" = c."sourceCityId"
        WHERE c."isOpenAir" = false
        ORDER BY ci.name, c.name`,
    );
    const matches = rows.filter((row) => isOpenAirCinemaName(row.name));

    for (const row of matches) {
      console.log(`${row.city ?? '?'}\t${row.name}\t${row.slug}`);
    }
    console.log(
      `\n${matches.length} of ${rows.length} unflagged cinemas match the open-air names.`,
    );

    if (matches.length === 0) return;

    await client.query('BEGIN');
    await client.query(
      `UPDATE cinemas SET "isOpenAir" = true WHERE id = ANY($1::int[])`,
      [matches.map((row) => row.id)],
    );
    await client.query(apply ? 'COMMIT' : 'ROLLBACK');
    console.log(
      apply
        ? `Flagged ${matches.length} cinemas as open-air.`
        : 'Dry run: nothing written. Re-run with --apply to save.',
    );
  } finally {
    await client.end();
  }
};

run(process.argv.includes('--apply')).catch((err) => {
  console.error(err);
  process.exit(1);
});
