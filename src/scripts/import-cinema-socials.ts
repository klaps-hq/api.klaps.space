/**
 * Import / refresh of cinema social data used by klaps.radar
 * (`instagramUsername`, `instagramCollab`, `facebookPlaceId`).
 *
 * Reads a semicolon-separated CSV with the columns
 *   filmweb;instagram;collab;facebook_place_id
 * and matches each row to a cinema by its Filmweb URL (`cinemas.url`).
 * `instagram` is a bare username (a leading "@" or a full instagram.com URL
 * is stripped), `collab` is "1"/"true" when the cinema agreed to collab
 * posts. Empty cells keep the existing value, so the script is idempotent
 * and safe to re-run. `updatedAt` is not touched, like in the contacts import.
 *
 * Usage:
 *   bunx ts-node -r dotenv/config src/scripts/import-cinema-socials.ts \
 *     --csv ../outreach/kina-instagram.csv [--dry-run]
 */
import 'dotenv/config';
import { readFileSync } from 'node:fs';
import { Client } from 'pg';

interface SocialRow {
  filmweb: string;
  instagram: string | null;
  collab: boolean | null;
  facebookPlaceId: string | null;
}

const USERNAME_PATTERN = /^[a-z0-9._]{1,30}$/;

const argValue = (name: string): string | undefined => {
  const i = process.argv.indexOf(name);
  return i !== -1 ? process.argv[i + 1] : undefined;
};

const normalizeUsername = (raw: string): string | null => {
  const username = raw
    .trim()
    .replace(/^https?:\/\/(www\.)?instagram\.com\//i, '')
    .replace(/^@/, '')
    .replace(/[/?#].*$/, '')
    .toLowerCase();
  return USERNAME_PATTERN.test(username) ? username : null;
};

const parseCollab = (raw: string): boolean | null => {
  const value = raw.trim().toLowerCase();
  if (!value) return null;
  return value === '1' || value === 'true';
};

/** Parses the import CSV into rows that carry at least one usable value. */
const parseCsv = (path: string): SocialRow[] => {
  const lines = readFileSync(path, 'utf8')
    .split(/\r?\n/)
    .filter((l) => l.trim().length > 0);

  const rows: SocialRow[] = [];
  for (const line of lines.slice(1)) {
    const cols = line.split(';');
    const filmweb = (cols[0] ?? '').trim();
    if (!filmweb) continue;

    const rawInstagram = (cols[1] ?? '').trim();
    const instagram = rawInstagram ? normalizeUsername(rawInstagram) : null;
    if (rawInstagram && !instagram) {
      console.warn(`Skipping invalid Instagram username "${rawInstagram}"`);
    }
    const collab = parseCollab(cols[2] ?? '');
    const facebookPlaceId = /^\d+$/.test((cols[3] ?? '').trim())
      ? (cols[3] ?? '').trim()
      : null;
    if (!instagram && collab === null && !facebookPlaceId) continue;

    rows.push({ filmweb, instagram, collab, facebookPlaceId });
  }
  return rows;
};

const run = async (dryRun: boolean, csvPath: string) => {
  const rows = parseCsv(csvPath);
  const client = new Client(process.env.DATABASE_URL);
  await client.connect();

  try {
    let updated = 0;
    const unmatched: string[] = [];

    await client.query('BEGIN');
    for (const row of rows) {
      const res = await client.query(
        `UPDATE cinemas
            SET "instagramUsername" = COALESCE($1, "instagramUsername"),
                "instagramCollab" = COALESCE($2, "instagramCollab"),
                "facebookPlaceId" = COALESCE($3, "facebookPlaceId")
          WHERE url = $4`,
        [row.instagram, row.collab, row.facebookPlaceId, row.filmweb],
      );
      if (res.rowCount && res.rowCount > 0) {
        updated += res.rowCount;
      } else {
        unmatched.push(row.filmweb);
      }
    }
    await client.query(dryRun ? 'ROLLBACK' : 'COMMIT');

    console.log(
      `${dryRun ? '[dry-run] would update' : 'Updated'} ${updated} of ` +
        `${rows.length} cinemas (${unmatched.length} CSV rows had no matching cinemas.url).`,
    );
    if (unmatched.length > 0) {
      console.log(`Unmatched Filmweb URLs:\n  ${unmatched.join('\n  ')}`);
    }
  } finally {
    await client.end();
  }
};

const csvPath = argValue('--csv');
if (!csvPath) {
  console.error(
    'Usage: import-cinema-socials.ts --csv <path-to-csv> [--dry-run]',
  );
  process.exit(1);
}

run(process.argv.includes('--dry-run'), csvPath).catch((err) => {
  console.error('Import failed:', err);
  process.exit(1);
});
