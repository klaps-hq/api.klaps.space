/**
 * Import of researched city guides (`cities.guide`).
 *
 * Reads a JSON array of `{ slug, guide }` produced by the research pipeline in
 * the frontend repo (scripts/city-guides: validate.mjs -> approved.json) and
 * sets the guide of each matching city. The current values of every touched
 * city are saved to --backup first. The scraper never writes `guide`, so the
 * texts stay until the next import.
 *
 * Usage:
 *   bunx ts-node -r dotenv/config src/scripts/import-city-guides.ts \
 *     --json ../klaps.space/scripts/city-guides/approved.json \
 *     --backup /tmp/city-guides-backup.json [--dry-run]
 */
import 'dotenv/config';
import { readFileSync, writeFileSync } from 'node:fs';
import { Client } from 'pg';

interface GuideRow {
  slug: string;
  guide: string;
}

const argValue = (name: string): string | undefined => {
  const i = process.argv.indexOf(name);
  return i !== -1 ? process.argv[i + 1] : undefined;
};

const run = async (dryRun: boolean, jsonPath: string, backupPath: string) => {
  const rows = (
    JSON.parse(readFileSync(jsonPath, 'utf8')) as GuideRow[]
  ).filter((row) => row.guide?.trim());
  const client = new Client(process.env.DATABASE_URL);
  await client.connect();

  try {
    const slugs = rows.map((row) => row.slug);
    const current = await client.query(
      'SELECT slug, guide FROM cities WHERE slug = ANY($1)',
      [slugs],
    );
    writeFileSync(backupPath, JSON.stringify(current.rows, null, 1));
    const known = new Set(
      current.rows.map((row: { slug: string }) => row.slug),
    );

    await client.query('BEGIN');
    let updated = 0;
    for (const row of rows) {
      const res = await client.query(
        'UPDATE cities SET guide = $2 WHERE slug = $1',
        [row.slug, row.guide.trim()],
      );
      updated += res.rowCount ?? 0;
    }
    await client.query(dryRun ? 'ROLLBACK' : 'COMMIT');

    console.log(
      `${dryRun ? '[dry-run] would update' : 'Updated'} ${updated} of ${rows.length} cities ` +
        `(backup of current values: ${backupPath}).`,
    );
    const unknown = slugs.filter((slug) => !known.has(slug));
    if (unknown.length > 0)
      console.log(`Unknown slugs:\n  ${unknown.join('\n  ')}`);
  } finally {
    await client.end();
  }
};

const jsonPath = argValue('--json');
const backupPath = argValue('--backup');
if (!jsonPath || !backupPath) {
  console.error(
    'Usage: import-city-guides.ts --json <approved.json> --backup <file> [--dry-run]',
  );
  process.exit(1);
}

run(process.argv.includes('--dry-run'), jsonPath, backupPath).catch((err) => {
  console.error('Import failed:', err);
  process.exit(1);
});
