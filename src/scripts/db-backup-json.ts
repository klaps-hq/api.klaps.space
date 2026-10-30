// Logical backup: dumps every public table to one JSON file (data only).
// Fallback when pg_dump is unavailable. Output goes outside the repo.
import { writeFileSync } from 'fs';
import { Pool } from 'pg';

const run = async () => {
  const out = process.argv[2];
  if (!out) {
    console.error('Podaj ścieżkę wyjściową');
    process.exit(1);
  }

  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    connectionTimeoutMillis: 8000,
  });
  try {
    const tables = (
      await pool.query<{ tablename: string }>(
        `SELECT tablename FROM pg_tables WHERE schemaname='public' ORDER BY tablename`,
      )
    ).rows.map((r) => r.tablename);
    const dump: Record<string, unknown[]> = {};
    let total = 0;
    for (const t of tables) {
      const r = await pool.query(`SELECT * FROM "${t}"`);
      dump[t] = r.rows;
      total += r.rows.length;
      console.log(`  ${t}: ${r.rows.length}`);
    }
    const payload = JSON.stringify({
      takenAt: process.argv[3] || 'unknown',
      tables: dump,
    });
    writeFileSync(out, payload, 'utf8');
    console.log(`\nTabel: ${tables.length}, rekordów: ${total}, plik: ${out}`);
  } finally {
    await pool.end();
  }
};

run().catch((err: Error) => {
  console.error('BŁĄD:', err.message);
  process.exit(1);
});
