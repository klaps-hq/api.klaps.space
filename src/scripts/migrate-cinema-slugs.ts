/**
 * One-time migration that rewrites slugs of cinemas whose slug base
 * (toSlug of the name) is not globally unique — chains like Helios,
 * Multikino, Cinema City, but also transliteration collisions like
 * "Kino ŚDK"/"Kino SDK" — from the arbitrary `-N` suffix scheme to
 * readable `name-city` slugs, e.g. `multikino-17` → `multikino-katowice`.
 *
 * Cinemas with a unique slug base keep their current slug — no URL churn.
 *
 * Usage: bun run src/scripts/migrate-cinema-slugs.ts [--dry-run]
 */
import 'dotenv/config';
import { Client } from 'pg';
import { cinemaSlug, toSlug, uniqueSlug } from '../lib/slug';

interface CinemaRow {
  id: number;
  slug: string;
  name: string;
  cityName: string | null;
}

const run = async (dryRun: boolean) => {
  const client = new Client(process.env.DATABASE_URL);
  await client.connect();

  try {
    const { rows: all } = await client.query<CinemaRow>(
      `SELECT cin.id, cin.slug, cin.name, ci.name AS "cityName"
       FROM cinemas cin
       LEFT JOIN cities ci ON ci."sourceId" = cin."sourceCityId"
       ORDER BY cin.id`,
    );

    // Grupowanie po bazie sluga (nie po nazwie) — łapie też kolizje
    // transliteracyjne, np. "Kino ŚDK" i "Kino SDK" → oba "kino-sdk".
    const byBase = new Map<string, CinemaRow[]>();
    for (const row of all) {
      const base = toSlug(row.name);
      byBase.set(base, [...(byBase.get(base) ?? []), row]);
    }
    const rows = [...byBase.values()]
      .filter((group) => group.length > 1)
      .flat()
      .sort((a, b) => a.id - b.id);

    if (rows.length === 0) {
      console.log('No duplicate-name cinemas found — nothing to migrate.');
      return;
    }

    // Slugs zajęte przez kina spoza migrowanych grup — nowe slugi nie mogą
    // z nimi kolidować. Stare slugi migrowanych wierszy zwalniamy.
    const migratedIds = new Set(rows.map((r) => r.id));
    const { rows: existing } = await client.query<{ id: number; slug: string }>(
      `SELECT id, slug FROM cinemas`,
    );
    const taken = new Set(
      existing.filter((r) => !migratedIds.has(r.id)).map((r) => r.slug),
    );

    await client.query('BEGIN');
    let updated = 0;
    for (const row of rows) {
      const base = row.cityName ? cinemaSlug(row.name, row.cityName) : row.slug;
      const slug = uniqueSlug(base, taken);
      taken.add(slug);

      if (slug === row.slug) continue;

      console.log(`  #${row.id} ${row.name}: ${row.slug} → ${slug}`);
      if (!dryRun) {
        await client.query(`UPDATE cinemas SET slug = $1 WHERE id = $2`, [
          slug,
          row.id,
        ]);
      }
      updated++;
    }
    await client.query(dryRun ? 'ROLLBACK' : 'COMMIT');

    console.log(
      `\n${dryRun ? '[dry-run] would update' : 'Updated'} ${updated} of ${rows.length} duplicate-name cinema(s).`,
    );
  } finally {
    await client.end();
  }
};

run(process.argv.includes('--dry-run')).catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
