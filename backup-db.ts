// Logical backup: dumps every public table to one JSON file (data only).
// Fallback when pg_dump is unavailable. Output goes outside the repo.
import { Pool } from 'pg';
import { writeFileSync } from 'node:fs';

const OUT = process.argv[2];
if (!OUT) { console.error('Podaj ścieżkę wyjściową'); process.exit(1); }

const pool = new Pool({ connectionString: process.env.DATABASE_URL, connectionTimeoutMillis: 8000 });
try {
  const tables = (await pool.query(
    `SELECT tablename FROM pg_tables WHERE schemaname='public' ORDER BY tablename`,
  )).rows.map((r: any) => r.tablename);
  const dump: Record<string, any[]> = {};
  let total = 0;
  for (const t of tables) {
    const r = await pool.query(`SELECT * FROM "${t}"`);
    dump[t] = r.rows;
    total += r.rows.length;
    console.log(`  ${t}: ${r.rows.length}`);
  }
  const payload = JSON.stringify({ takenAt: process.argv[3] || 'unknown', tables: dump });
  writeFileSync(OUT, payload, 'utf8');
  console.log(`\nTabel: ${tables.length}, rekordów: ${total}, plik: ${OUT}`);
} catch (e) {
  console.error('BŁĄD:', (e as Error).message);
  process.exitCode = 1;
} finally {
  await pool.end();
}
