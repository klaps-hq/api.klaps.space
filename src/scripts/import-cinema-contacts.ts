/**
 * Import / refresh of cinema contact data (`email`, `website`).
 *
 * Reads a semicolon-separated CSV with the columns
 *   filmweb;miasto;kino;email;website;rodzaj;zrodlo
 * and matches each row to a cinema by its Filmweb URL (`cinemas.url`, the same
 * URL the scraper stores). For every match it sets `email` and/or `website`
 * when the CSV provides a non-empty, non-"NOT_FOUND" value; existing values are
 * kept when the CSV cell is empty, so the script is idempotent and safe to
 * re-run. `updatedAt` is intentionally NOT touched - it tracks content changes
 * consumed by the sitemap/IndexNow flow, not contact-data edits.
 *
 * The CSV lives outside this repo (cinema contacts contain personal data), so
 * its path must be passed explicitly.
 *
 * Usage:
 *   bunx ts-node -r dotenv/config src/scripts/import-cinema-contacts.ts \
 *     --csv ../outreach/kina-maile-IMPORT.csv [--dry-run]
 */
import 'dotenv/config';
import { readFileSync } from 'node:fs';
import { Client } from 'pg';

interface ContactRow {
  filmweb: string;
  email: string | null;
  website: string | null;
}

const argValue = (name: string): string | undefined => {
  const i = process.argv.indexOf(name);
  return i !== -1 ? process.argv[i + 1] : undefined;
};

/** Parses the import CSV into rows that carry a usable email and/or website. */
const parseCsv = (path: string): ContactRow[] => {
  const lines = readFileSync(path, 'utf8')
    .split(/\r?\n/)
    .filter((l) => l.trim().length > 0);

  const rows: ContactRow[] = [];
  for (const line of lines.slice(1)) {
    const cols = line.split(';');
    const filmweb = (cols[0] ?? '').trim();
    const rawEmail = (cols[3] ?? '').trim();
    const rawWebsite = (cols[4] ?? '').trim();
    if (!filmweb) continue;

    const email = rawEmail && rawEmail !== 'NOT_FOUND' ? rawEmail : null;
    const website = rawWebsite.length > 0 ? rawWebsite : null;
    if (!email && !website) continue;

    rows.push({ filmweb, email, website });
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
            SET email = COALESCE($1, email),
                website = COALESCE($2, website)
          WHERE url = $3`,
        [row.email, row.website, row.filmweb],
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
    'Usage: import-cinema-contacts.ts --csv <path-to-csv> [--dry-run]',
  );
  process.exit(1);
}

run(process.argv.includes('--dry-run'), csvPath).catch((err) => {
  console.error('Import failed:', err);
  process.exit(1);
});
