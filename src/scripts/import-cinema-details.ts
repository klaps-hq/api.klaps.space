/**
 * Import of researched venue details (rooms, contact, links, accessibility,
 * logo, photos) into the cinemas table.
 *
 * Reads a JSON array produced by the research pipeline in the frontend repo
 * (scripts/cinema-details: validate.mjs, then mirror.mjs, which uploads logos
 * and photos to the media bucket). Each row is matched by `slug`. Detail
 * columns are replaced as a whole per cinema, so a re-run with fresher
 * research is idempotent; `email` is only filled when empty, because the
 * outreach import may have set a better address. Before writing, the current
 * values of every touched cinema are saved to --backup.
 *
 * `updatedAt` is intentionally NOT touched (it feeds the sitemap/IndexNow
 * flow); `detailsUpdatedAt` records the research pass instead.
 *
 * Usage:
 *   bunx ts-node -r dotenv/config src/scripts/import-cinema-details.ts \
 *     --json ../klaps.space/scripts/cinema-details/import.json \
 *     --backup /tmp/cinema-details-backup.json [--dry-run]
 */
import 'dotenv/config';
import { readFileSync, writeFileSync } from 'node:fs';
import { Client } from 'pg';
import type {
  CinemaAccessibility,
  CinemaPhoto,
  CinemaRoom,
} from '../database/schemas/cinemas.schema';

interface DetailsRow {
  slug: string;
  phone: string | null;
  email: string | null;
  repertoireUrl: string | null;
  bookingUrl: string | null;
  facebookUrl: string | null;
  instagramUrl: string | null;
  operatorName: string | null;
  operatorUrl: string | null;
  screens: number | null;
  rooms: CinemaRoom[] | null;
  accessibility: CinemaAccessibility | null;
  logoUrl: string | null;
  photos: CinemaPhoto[];
}

const DETAIL_COLUMNS = [
  'phone',
  'repertoireUrl',
  'bookingUrl',
  'facebookUrl',
  'instagramUrl',
  'operatorName',
  'operatorUrl',
  'screens',
  'rooms',
  'accessibility',
  'logoUrl',
  'photos',
] as const;

const argValue = (name: string): string | undefined => {
  const i = process.argv.indexOf(name);
  return i !== -1 ? process.argv[i + 1] : undefined;
};

/** A row with nothing researched would only wipe columns; skip it. */
const hasData = (row: DetailsRow): boolean =>
  DETAIL_COLUMNS.some((column) => {
    const value = row[column];
    return Array.isArray(value) ? value.length > 0 : value !== null;
  });

const run = async (dryRun: boolean, jsonPath: string, backupPath: string) => {
  const rows = (
    JSON.parse(readFileSync(jsonPath, 'utf8')) as DetailsRow[]
  ).filter(hasData);
  const client = new Client(process.env.DATABASE_URL);
  await client.connect();

  try {
    const slugs = rows.map((row) => row.slug);
    const current = await client.query(
      `SELECT slug, email, ${DETAIL_COLUMNS.map((c) => `"${c}"`).join(', ')}, "detailsUpdatedAt"
         FROM cinemas WHERE slug = ANY($1)`,
      [slugs],
    );
    writeFileSync(backupPath, JSON.stringify(current.rows, null, 1));

    const known = new Set(
      current.rows.map((row: { slug: string }) => row.slug),
    );
    const unmatched = slugs.filter((slug) => !known.has(slug));

    await client.query('BEGIN');
    let updated = 0;
    for (const row of rows) {
      if (!known.has(row.slug)) continue;
      const res = await client.query(
        `UPDATE cinemas
            SET phone = $2, "repertoireUrl" = $3, "bookingUrl" = $4,
                "facebookUrl" = $5, "instagramUrl" = $6,
                "operatorName" = $7, "operatorUrl" = $8,
                screens = $9, rooms = $10, accessibility = $11,
                "logoUrl" = $12, photos = $13,
                email = COALESCE(email, $14),
                "detailsUpdatedAt" = now()
          WHERE slug = $1`,
        [
          row.slug,
          row.phone,
          row.repertoireUrl,
          row.bookingUrl,
          row.facebookUrl,
          row.instagramUrl,
          row.operatorName,
          row.operatorUrl,
          row.screens,
          row.rooms ? JSON.stringify(row.rooms) : null,
          row.accessibility ? JSON.stringify(row.accessibility) : null,
          row.logoUrl,
          row.photos.length ? JSON.stringify(row.photos) : null,
          row.email,
        ],
      );
      updated += res.rowCount ?? 0;
    }
    await client.query(dryRun ? 'ROLLBACK' : 'COMMIT');

    console.log(
      `${dryRun ? '[dry-run] would update' : 'Updated'} ${updated} of ${rows.length} cinemas ` +
        `(backup of current values: ${backupPath}).`,
    );
    if (unmatched.length > 0) {
      console.log(`Unknown slugs:\n  ${unmatched.join('\n  ')}`);
    }
  } finally {
    await client.end();
  }
};

const jsonPath = argValue('--json');
const backupPath = argValue('--backup');
if (!jsonPath || !backupPath) {
  console.error(
    'Usage: import-cinema-details.ts --json <import.json> --backup <file> [--dry-run]',
  );
  process.exit(1);
}

run(process.argv.includes('--dry-run'), jsonPath, backupPath).catch((err) => {
  console.error('Import failed:', err);
  process.exit(1);
});
