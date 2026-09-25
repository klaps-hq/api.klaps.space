/**
 * Merges duplicate `movies` rows - two rows describing the same film, created
 * because one of them carries a WRONG Filmweb `sourceId` (movies are upserted
 * on `sourceId`, so a bad id never collides and lands as a second row with a
 * `-2` slug).
 *
 * Duplicates are grouped by (lower(titleOriginal), productionYear) and the
 * canonical row is decided by Filmweb, not by heuristics: each candidate's
 * `sourceId` is fetched from /api/v1/film/:id/info and must describe the same
 * film. Exactly one match → merge the rest into it; zero or several matches →
 * the group is reported and left untouched (manual call).
 *
 * A row with a wrong sourceId is dropped rather than repaired: the film that
 * id really points at will be inserted as its own row on the next scraper run.
 *
 * Merging moves everything that references the duplicate (screenings, the
 * movies_* join tables, socials_posts) onto the canonical row, skipping rows
 * that would violate a unique constraint, then deletes the duplicate. When the
 * duplicate frees the un-suffixed slug, the canonical row takes it over - that
 * URL is the one search engines already know.
 *
 * Runs in a single transaction; --dry-run rolls it back. Idempotent.
 *
 * Note: writes straight to the DB, so no IndexNow ping is emitted - submit the
 * affected movie URLs manually if the change should be picked up faster.
 *
 * Usage: bunx ts-node -r dotenv/config src/scripts/merge-duplicate-movies.ts [--dry-run]
 */
import 'dotenv/config';
import { Client } from 'pg';
import { movieSlug, toSlug } from '../lib/slug';

interface MovieRow {
  id: number;
  sourceId: number;
  slug: string;
  title: string;
  titleOriginal: string;
  productionYear: number;
}

interface FilmwebInfo {
  title?: string;
  originalTitle?: string;
  year?: number;
}

/** Join tables owning a (movieId, X) unique pair. */
const JOIN_TABLES: ReadonlyArray<[table: string, column: string]> = [
  ['movies_actors', 'actorId'],
  ['movies_countries', 'countryId'],
  ['movies_directors', 'directorId'],
  ['movies_genres', 'genreId'],
  ['movies_scriptwriters', 'scriptwriterId'],
];

const FILMWEB_INFO_URL = 'https://www.filmweb.pl/api/v1/film';
const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36';
/** Filmweb is not rate-limit documented; keep the audit gentle. */
const FETCH_DELAY_MS = 150;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Fetches Filmweb's own record for a sourceId; null when it 404s or fails. */
const fetchFilmwebInfo = async (
  sourceId: number,
): Promise<FilmwebInfo | null> => {
  try {
    const res = await fetch(`${FILMWEB_INFO_URL}/${sourceId}/info`, {
      headers: { 'User-Agent': USER_AGENT, Accept: 'application/json' },
    });
    return res.ok ? ((await res.json()) as FilmwebInfo) : null;
  } catch {
    return null;
  } finally {
    await sleep(FETCH_DELAY_MS);
  }
};

/** True when Filmweb's record describes the same film as the klaps row. */
const describesSameFilm = (row: MovieRow, info: FilmwebInfo): boolean => {
  const titleMatches =
    toSlug(info.originalTitle ?? '') === toSlug(row.titleOriginal) ||
    toSlug(info.title ?? '') === toSlug(row.title);
  // Filmweb occasionally reports the premiere year one off the production year.
  const yearMatches =
    info.year === undefined || Math.abs(info.year - row.productionYear) <= 1;

  return titleMatches && yearMatches;
};

const run = async (dryRun: boolean) => {
  const client = new Client(process.env.DATABASE_URL);
  await client.connect();

  try {
    const { rows } = await client.query<MovieRow>(
      `SELECT id, "sourceId", slug, title, "titleOriginal", "productionYear"
         FROM movies
        WHERE (lower("titleOriginal"), "productionYear") IN (
                SELECT lower("titleOriginal"), "productionYear"
                  FROM movies
                 GROUP BY lower("titleOriginal"), "productionYear"
                HAVING count(*) > 1)
        ORDER BY lower("titleOriginal"), "productionYear", id`,
    );

    if (rows.length === 0) {
      console.log('No duplicate movies found.');
      return;
    }

    const groups = new Map<string, MovieRow[]>();
    for (const row of rows) {
      const key = `${row.titleOriginal.toLowerCase()}|${row.productionYear}`;
      groups.set(key, [...(groups.get(key) ?? []), row]);
    }

    console.log(
      `Duplicate groups: ${groups.size} (${rows.length} rows)` +
        `${dryRun ? ' [dry-run]' : ''}\n`,
    );

    await client.query('BEGIN');

    let merged = 0;
    let skipped = 0;

    for (const group of groups.values()) {
      const label = `"${group[0].titleOriginal}" (${group[0].productionYear})`;
      const verified: MovieRow[] = [];

      for (const row of group) {
        const info = await fetchFilmwebInfo(row.sourceId);
        const ok = info !== null && describesSameFilm(row, info);
        console.log(
          `  id=${row.id} sourceId=${row.sourceId} slug=${row.slug} → ` +
            (info === null
              ? 'Filmweb: not found'
              : `Filmweb: "${info.title}" / "${info.originalTitle}" (${info.year})`) +
            (ok ? '  ✓ canonical candidate' : '  ✗'),
        );
        if (ok) verified.push(row);
      }

      if (verified.length !== 1) {
        console.log(
          `  ${label}: ${verified.length} rows match Filmweb - skipped, needs a manual call\n`,
        );
        skipped++;
        continue;
      }

      const canonical = verified[0];
      const duplicates = group.filter((row) => row.id !== canonical.id);

      for (const duplicate of duplicates) {
        await mergeInto(client, canonical.id, duplicate.id);
        console.log(`  ${label}: merged id=${duplicate.id} → ${canonical.id}`);
      }

      const freedSlug = await takeOverSlug(client, canonical);
      if (freedSlug !== null) {
        console.log(`  ${label}: slug ${canonical.slug} → ${freedSlug}`);
      }
      merged++;
      console.log('');
    }

    await client.query(dryRun ? 'ROLLBACK' : 'COMMIT');

    console.log(
      `${dryRun ? '[dry-run] would merge' : 'Merged'} ${merged} group(s), ` +
        `skipped ${skipped}.`,
    );
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    await client.end();
  }
};

/**
 * Repoints every reference from `duplicateId` to `canonicalId` and deletes the
 * duplicate row. Rows that would collide with an existing unique pair are left
 * behind and dropped with the duplicate - the canonical row already has them.
 */
const mergeInto = async (
  client: Client,
  canonicalId: number,
  duplicateId: number,
): Promise<void> => {
  const screenings = await client.query(
    `UPDATE screenings s SET "movieId" = $1
      WHERE s."movieId" = $2
        AND NOT EXISTS (
              SELECT 1 FROM screenings c
               WHERE c."movieId" = $1
                 AND c."cinemaId" = s."cinemaId"
                 AND c.date = s.date
                 AND c.type = s.type
                 AND c."isDubbing" = s."isDubbing"
                 AND c."isSubtitled" = s."isSubtitled")`,
    [canonicalId, duplicateId],
  );
  const droppedScreenings = await client.query(
    `DELETE FROM screenings WHERE "movieId" = $1`,
    [duplicateId],
  );
  console.log(
    `    screenings: ${screenings.rowCount} moved, ` +
      `${droppedScreenings.rowCount} already on the canonical row`,
  );

  for (const [table, column] of JOIN_TABLES) {
    await client.query(
      `UPDATE ${table} t SET "movieId" = $1
        WHERE t."movieId" = $2
          AND NOT EXISTS (
                SELECT 1 FROM ${table} c
                 WHERE c."movieId" = $1 AND c."${column}" = t."${column}")`,
      [canonicalId, duplicateId],
    );
    await client.query(`DELETE FROM ${table} WHERE "movieId" = $1`, [
      duplicateId,
    ]);
  }

  await client.query(
    `UPDATE socials_posts SET "movieId" = $1 WHERE "movieId" = $2`,
    [canonicalId, duplicateId],
  );

  await client.query(`DELETE FROM movies WHERE id = $1`, [duplicateId]);
};

/**
 * Moves the canonical row onto its un-suffixed slug once the duplicate holding
 * it is gone. Returns the new slug, or null when nothing changed.
 */
const takeOverSlug = async (
  client: Client,
  canonical: MovieRow,
): Promise<string | null> => {
  const wanted = movieSlug(canonical.title, canonical.productionYear);
  if (wanted === canonical.slug) return null;

  const { rowCount } = await client.query(
    `SELECT 1 FROM movies WHERE slug = $1`,
    [wanted],
  );
  if (rowCount !== 0) return null;

  await client.query(
    `UPDATE movies SET slug = $1, "updatedAt" = now() WHERE id = $2`,
    [wanted, canonical.id],
  );
  return wanted;
};

run(process.argv.includes('--dry-run')).catch((err) => {
  console.error(err);
  process.exit(1);
});
