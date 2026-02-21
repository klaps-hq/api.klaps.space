import 'dotenv/config';
import { drizzle } from 'drizzle-orm/mysql2';
import { getTableName, sql } from 'drizzle-orm';
import * as schema from '../database/schemas';

const BLOCKED_ENVS = ['production', 'prod'];

const run = async () => {
  const nodeEnv = (process.env.NODE_ENV ?? '').toLowerCase();

  if (BLOCKED_ENVS.includes(nodeEnv)) {
    console.error(
      `Aborted — db:wipe is not allowed when NODE_ENV="${process.env.NODE_ENV}".`,
    );
    process.exit(1);
  }

  const db = drizzle(process.env.DATABASE_URL!, { schema, mode: 'default' });

  // Order matters: delete from child/junction tables before parent tables.
  const tables = [
    schema.screenings,
    schema.movies_actors,
    schema.movies_countries,
    schema.movies_directors,
    schema.movies_genres,
    schema.movies_scriptwriters,
    schema.showtimes,
    schema.cinemas,
    schema.movies,
    schema.actors,
    schema.countries,
    schema.directors,
    schema.genres,
    schema.scriptwriters,
    schema.cities,
  ];

  console.log('Wiping all tables...\n');

  await db.execute(sql`SET FOREIGN_KEY_CHECKS = 0`);

  for (const table of tables) {
    await db.delete(table);
    console.log(`✓ ${getTableName(table)}`);
  }

  await db.execute(sql`SET FOREIGN_KEY_CHECKS = 1`);

  console.log('\nDone — all tables wiped.');
  process.exit(0);
};

run().catch((err) => {
  console.error('Failed to wipe database:', err);
  process.exit(1);
});
