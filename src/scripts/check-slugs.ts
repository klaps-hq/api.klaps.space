import 'dotenv/config';
import { Client, type QueryResultRow } from 'pg';

const run = async () => {
  const client = new Client(process.env.DATABASE_URL);
  await client.connect();
  try {
    for (const table of ['movies', 'cinemas', 'cities', 'genres']) {
      const { rows } = await client.query<QueryResultRow>(
        `SELECT column_name FROM information_schema.columns WHERE table_name = $1 AND column_name = 'slug'`,
        [table],
      );
      console.log(`${table}.slug: ${rows.length > 0 ? 'EXISTS' : 'MISSING'}`);
    }
    const { rows: mig } = await client.query<QueryResultRow>(
      'SELECT hash FROM "__drizzle_migrations"',
    );
    console.log(`migrations recorded: ${mig.length}`);
  } finally {
    await client.end();
  }
};

run().catch((e: unknown) => {
  const message = e instanceof Error ? e.message : String(e);
  console.error(message);
  process.exit(1);
});
