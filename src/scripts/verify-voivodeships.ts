/**
 * Verifies `cities.voivodeship` against OpenStreetMap reverse geocoding.
 *
 * For every city that has at least one cinema with coordinates, the centroid
 * of its cinemas is reverse-geocoded via Nominatim and the returned state is
 * compared with the stored voivodeship. Mismatches are reported — nothing is
 * written to the database.
 *
 * Respects the Nominatim usage policy (1 request/s, descriptive User-Agent).
 *
 * Usage: bun run src/scripts/verify-voivodeships.ts
 */
import 'dotenv/config';
import { Client } from 'pg';

interface CityCentroid {
  id: number;
  name: string;
  voivodeship: string | null;
  lat: number;
  lon: number;
}

const NOMINATIM_URL = 'https://nominatim.openstreetmap.org/reverse';
const USER_AGENT = 'klaps-api-voivodeship-verifier/1.0 (https://klaps.space)';

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

const normalizeState = (state: string | undefined): string | null =>
  state ? state.replace(/^województwo\s+/i, '').toLowerCase() : null;

const run = async () => {
  const client = new Client(process.env.DATABASE_URL);
  await client.connect();

  try {
    const { rows } = await client.query<CityCentroid>(
      `SELECT ci.id, ci.name, ci.voivodeship,
              avg(cin.latitude)::float AS lat, avg(cin.longitude)::float AS lon
       FROM cities ci
       JOIN cinemas cin ON cin."sourceCityId" = ci."sourceId"
       WHERE cin.latitude IS NOT NULL AND cin.longitude IS NOT NULL
       GROUP BY ci.id, ci.name, ci.voivodeship
       ORDER BY ci.name`,
    );
    console.log(`Verifying ${rows.length} cities against OSM…`);

    const mismatches: string[] = [];
    let checked = 0;
    let failed = 0;

    for (const row of rows) {
      const url = `${NOMINATIM_URL}?lat=${row.lat}&lon=${row.lon}&format=jsonv2&zoom=8&accept-language=pl`;
      try {
        const res = await fetch(url, {
          headers: { 'User-Agent': USER_AGENT },
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = (await res.json()) as {
          address?: { state?: string };
        };
        const osmState = normalizeState(data.address?.state);

        if (!osmState) {
          failed++;
          console.log(`  ? #${row.id} ${row.name}: no state in OSM response`);
        } else if (osmState !== row.voivodeship) {
          mismatches.push(
            `#${row.id} ${row.name}: db=${row.voivodeship ?? '∅'}, osm=${osmState}`,
          );
          console.log(`  ✗ ${mismatches[mismatches.length - 1]}`);
        }
      } catch (err) {
        failed++;
        console.log(`  ? #${row.id} ${row.name}: ${String(err)}`);
      }

      checked++;
      if (checked % 25 === 0) {
        console.log(`  …${checked}/${rows.length}`);
      }
      await sleep(1100);
    }

    console.log(
      `\nChecked ${checked} cities: ${mismatches.length} mismatch(es), ${failed} lookup failure(s).`,
    );
    if (mismatches.length > 0) {
      console.log(`Mismatches:\n  ${mismatches.join('\n  ')}`);
    }
  } finally {
    await client.end();
  }
};

run().catch((err) => {
  console.error('Verification failed:', err);
  process.exit(1);
});
