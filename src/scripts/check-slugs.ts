import 'dotenv/config';
import { createConnection } from 'mysql2/promise';

const run = async () => {
  const connection = await createConnection(process.env.DATABASE_URL!);
  try {
    for (const table of ['movies', 'cinemas', 'cities', 'genres']) {
      const [rows] = await connection.execute<any[]>(
        `SHOW COLUMNS FROM \`${table}\` WHERE Field = 'slug'`,
      );
      console.log(`${table}.slug: ${rows.length > 0 ? 'EXISTS' : 'MISSING'}`);
    }
    const [mig] = await connection.execute<any[]>(
      'SELECT hash FROM `__drizzle_migrations`',
    );
    console.log(`migrations recorded: ${mig.length}`);
  } finally {
    await connection.end();
  }
};

run().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
