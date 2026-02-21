/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-require-imports */
import 'dotenv/config';
import { readFileSync } from 'fs';
import { join } from 'path';
import { createConnection } from 'mysql2/promise';

interface JournalEntry {
  idx: number;
  when: number;
  tag: string;
  breakpoints: boolean;
}

interface Journal {
  version: string;
  dialect: string;
  entries: JournalEntry[];
}

const MIGRATIONS_DIR = join(__dirname, '..', 'database', 'migrations');

const run = async () => {
  const journalPath = join(MIGRATIONS_DIR, 'meta', '_journal.json');

  let journal: Journal;
  try {
    journal = JSON.parse(readFileSync(journalPath, 'utf-8'));
  } catch {
    console.error(
      `Could not read ${journalPath}.\n` +
        'Run "yarn db:generate" first to create the baseline migration.',
    );
    process.exit(1);
  }

  if (journal.entries.length === 0) {
    console.log('No migrations in journal — nothing to baseline.');
    process.exit(0);
  }

  const connection = await createConnection(process.env.DATABASE_URL!);

  try {
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS \`__drizzle_migrations\` (
        \`id\`         SERIAL PRIMARY KEY,
        \`hash\`       TEXT    NOT NULL,
        \`created_at\` BIGINT
      )
    `);

    const [existingRows] = await connection.execute<any[]>(
      'SELECT `hash` FROM `__drizzle_migrations`',
    );
    const appliedHashes = new Set(existingRows.map((r: any) => r.hash));

    let baselined = 0;

    for (const entry of journal.entries) {
      const migrationSql = readFileSync(
        join(MIGRATIONS_DIR, `${entry.tag}.sql`),
        'utf-8',
      );
      const hash = computeHash(migrationSql);

      if (appliedHashes.has(hash)) {
        console.log(`  skip  ${entry.tag} (already recorded)`);
        continue;
      }

      await connection.execute(
        'INSERT INTO `__drizzle_migrations` (`hash`, `created_at`) VALUES (?, ?)',
        [hash, entry.when],
      );
      console.log(`  mark  ${entry.tag}`);
      baselined++;
    }

    console.log(
      `\nDone — ${baselined} migration(s) marked as already applied.`,
    );
  } finally {
    await connection.end();
  }
};

const computeHash = (content: string): string => {
  const { createHash } = require('crypto');
  return createHash('sha256').update(content).digest('hex');
};

run().catch((err) => {
  console.error('Baseline failed:', err);
  process.exit(1);
});
