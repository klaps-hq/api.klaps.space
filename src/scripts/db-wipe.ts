import 'dotenv/config';
import { drizzle } from 'drizzle-orm/mysql2';
import { getTableName, sql } from 'drizzle-orm';
import * as schema from '../database/schemas';

/**
 * Wipes all rows from every table in the database.
 * Tables are deleted in order to respect foreign key constraints
 * (junction/child tables first, then parent tables).
 */
const run = async () => {
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
