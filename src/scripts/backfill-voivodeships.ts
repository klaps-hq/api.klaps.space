/**
 * Backfill of `cities.voivodeship` - safe to re-run as new cities appear.
 *
 * Resolution order per city:
 *   1. exact name match against the CITY_VOIVODESHIPS dictionary,
 *   2. OSM reverse geocoding of the city's cinema centroid (new cities
 *      missing from the dictionary; respects Nominatim's 1 req/s policy),
 *   3. fallback: areacode → voivodeship of the numbering-zone seat.
 *
 * When the dictionary and areacode disagree the dictionary wins (numbering
 * zones follow pre-1999 borders, e.g. Janów Lubelski has areacode 15 of the
 * Tarnobrzeg zone but lies in lubelskie) - the conflict is logged for review.
 * Cities resolved by no source are reported as unmatched and can be fixed
 * manually via POST /cities/:slug.
 *
 * Usage: bun run src/scripts/backfill-voivodeships.ts [--dry-run]
 */
import 'dotenv/config';
import { Client } from 'pg';
import {
  AREACODE_TO_VOIVODESHIP,
  VOIVODESHIPS,
  type Voivodeship,
} from '../lib/voivodeships';
import { CITY_VOIVODESHIPS } from './data/city-voivodeships';

interface CityRow {
  id: number;
  name: string;
  areacode: number | null;
  voivodeship: string | null;
  lat: number | null;
  lon: number | null;
}

const NOMINATIM_URL = 'https://nominatim.openstreetmap.org/reverse';
const USER_AGENT = 'klaps-api-voivodeship-backfill/1.0 (https://klaps.space)';

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

const isVoivodeship = (value: string): value is Voivodeship =>
  (VOIVODESHIPS as readonly string[]).includes(value);

/** Reverse-geocodes a point to a voivodeship via Nominatim, null on failure. */
const voivodeshipFromOsm = async (
  lat: number,
  lon: number,
): Promise<Voivodeship | null> => {
  const url = `${NOMINATIM_URL}?lat=${lat}&lon=${lon}&format=jsonv2&zoom=8&accept-language=pl`;
  try {
    const res = await fetch(url, { headers: { 'User-Agent': USER_AGENT } });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = (await res.json()) as { address?: { state?: string } };
    const state = data.address?.state
      ?.replace(/^województwo\s+/i, '')
      .toLowerCase();
    return state !== undefined && isVoivodeship(state) ? state : null;
  } catch {
    return null;
  } finally {
    await sleep(1100);
  }
};

const run = async (dryRun: boolean) => {
  const client = new Client(process.env.DATABASE_URL);
  await client.connect();

  try {
    const { rows } = await client.query<CityRow>(
      `SELECT ci.id, ci.name, ci.areacode, ci.voivodeship,
              avg(cin.latitude)::float AS lat, avg(cin.longitude)::float AS lon
       FROM cities ci
       LEFT JOIN cinemas cin ON cin."sourceCityId" = ci."sourceId"
        AND cin.latitude IS NOT NULL AND cin.longitude IS NOT NULL
       GROUP BY ci.id, ci.name, ci.areacode, ci.voivodeship
       ORDER BY ci.name`,
    );

    const unmatched: string[] = [];
    let updated = 0;
    let byName = 0;
    let byOsm = 0;
    let byAreacode = 0;

    await client.query('BEGIN');
    for (const row of rows) {
      const fromName = CITY_VOIVODESHIPS[row.name];
      const fromAreacode =
        row.areacode !== null
          ? AREACODE_TO_VOIVODESHIP[row.areacode]
          : undefined;

      if (fromName && fromAreacode && fromName !== fromAreacode) {
        console.log(
          `  conflict #${row.id} ${row.name}: name→${fromName}, areacode ${row.areacode}→${fromAreacode} (name wins)`,
        );
      }

      // OSM only for cities missing from the dictionary that have a cinema
      // centroid - new scraper cities; one request per city at 1 req/s.
      const fromOsm =
        !fromName && row.lat !== null && row.lon !== null
          ? await voivodeshipFromOsm(row.lat, row.lon)
          : null;

      const resolved = fromName ?? fromOsm ?? fromAreacode;
      if (!resolved) {
        unmatched.push(row.name);
        continue;
      }
      if (fromName) byName++;
      else if (fromOsm) byOsm++;
      else byAreacode++;

      if (resolved === row.voivodeship) continue;

      console.log(
        `  #${row.id} ${row.name}: ${row.voivodeship ?? '∅'} → ${resolved}`,
      );
      if (!dryRun) {
        await client.query(`UPDATE cities SET voivodeship = $1 WHERE id = $2`, [
          resolved,
          row.id,
        ]);
      }
      updated++;
    }
    await client.query(dryRun ? 'ROLLBACK' : 'COMMIT');

    console.log(
      `\n${dryRun ? '[dry-run] would update' : 'Updated'} ${updated} of ${rows.length} cities ` +
        `(${byName} by name, ${byOsm} by OSM, ${byAreacode} by areacode fallback).`,
    );
    if (unmatched.length > 0) {
      console.log(
        `Unmatched (${unmatched.length}) - fix manually via POST /cities/:slug:\n  ${unmatched.join('\n  ')}`,
      );
    }
  } finally {
    await client.end();
  }
};

run(process.argv.includes('--dry-run')).catch((err) => {
  console.error('Backfill failed:', err);
  process.exit(1);
});
