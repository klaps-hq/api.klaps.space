/**
 * Backfills `photoUrl` and `bio` on `directors` from TMDB, keyed by sourceId
 * (the TMDB person id). The API itself never calls TMDB at request time — this
 * one-off/periodic script populates the columns that POST /movies/batch leaves
 * null. Re-runnable: only touches directors still missing a photo or bio, and
 * never overwrites an existing value with an empty one.
 *
 * Auth (set one in .env):
 *   TMDB_READ_TOKEN  - v4 read access token (sent as Bearer), preferred
 *   TMDB_API_KEY     - v3 API key (sent as ?api_key=)
 *
 * Usage: bunx ts-node -r dotenv/config src/scripts/backfill-director-photos.ts
 */
import 'dotenv/config';
import { Client, type QueryResultRow } from 'pg';

const IMAGE_BASE = 'https://image.tmdb.org/t/p/w500';
const TMDB_BASE = 'https://api.themoviedb.org/3';
const CONCURRENCY = 8;

const readToken = process.env.TMDB_READ_TOKEN;
const apiKey = process.env.TMDB_API_KEY;

type TmdbPerson = { profile_path: string | null; biography?: string };

const buildUrl = (sourceId: number, language: string): string => {
  const params = new URLSearchParams({ language });
  if (!readToken && apiKey) params.set('api_key', apiKey);
  return `${TMDB_BASE}/person/${sourceId}?${params.toString()}`;
};

const fetchPerson = async (
  sourceId: number,
  language: string,
): Promise<TmdbPerson | null> => {
  const res = await fetch(buildUrl(sourceId, language), {
    headers: readToken ? { Authorization: `Bearer ${readToken}` } : {},
  });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`TMDB ${res.status} for person ${sourceId}`);
  return (await res.json()) as TmdbPerson;
};

const resolvePhotoAndBio = async (
  sourceId: number,
): Promise<{ photoUrl: string | null; bio: string | null }> => {
  // Biography is not auto-translated by TMDB, so prefer pl-PL then fall back
  // to en-US when the Polish entry is empty.
  const pl = await fetchPerson(sourceId, 'pl-PL');
  if (!pl) return { photoUrl: null, bio: null };

  let bio = pl.biography?.trim() || null;
  if (!bio) {
    const en = await fetchPerson(sourceId, 'en-US');
    bio = en?.biography?.trim() || null;
  }

  const photoUrl = pl.profile_path ? `${IMAGE_BASE}${pl.profile_path}` : null;
  return { photoUrl, bio };
};

const run = async () => {
  if (!readToken && !apiKey) {
    throw new Error(
      'Set TMDB_READ_TOKEN (v4 bearer) or TMDB_API_KEY (v3) in .env',
    );
  }

  const client = new Client(process.env.DATABASE_URL);
  await client.connect();

  try {
    const { rows } = await client.query<QueryResultRow>(
      `SELECT id, "sourceId" FROM directors
       WHERE "photoUrl" IS NULL OR bio IS NULL
       ORDER BY id`,
    );

    if (rows.length === 0) {
      console.log('directors: nothing to backfill');
      return;
    }

    console.log(`directors: fetching TMDB data for ${rows.length} row(s)...`);

    let updated = 0;
    let skipped = 0;
    let failed = 0;

    for (let i = 0; i < rows.length; i += CONCURRENCY) {
      const batch = rows.slice(i, i + CONCURRENCY);
      await Promise.all(
        batch.map(async (row) => {
          const sourceId = row.sourceId as number;
          try {
            const { photoUrl, bio } = await resolvePhotoAndBio(sourceId);
            if (!photoUrl && !bio) {
              skipped++;
              return;
            }
            // COALESCE keeps any value already present; only fills gaps.
            await client.query(
              `UPDATE directors
               SET "photoUrl" = COALESCE("photoUrl", $1),
                   bio = COALESCE(bio, $2),
                   "updatedAt" = now()
               WHERE id = $3`,
              [photoUrl, bio, row.id],
            );
            updated++;
          } catch (err) {
            failed++;
            console.warn(
              `  person ${sourceId} failed: ${err instanceof Error ? err.message : String(err)}`,
            );
          }
        }),
      );
      console.log(
        `  processed ${Math.min(i + CONCURRENCY, rows.length)}/${rows.length}`,
      );
    }

    console.log(
      `directors: ${updated} updated, ${skipped} without TMDB data, ${failed} failed`,
    );
  } finally {
    await client.end();
  }
};

run().catch((err) => {
  console.error('Photo backfill failed:', err);
  process.exit(1);
});
