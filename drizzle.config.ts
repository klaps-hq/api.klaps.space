import 'dotenv/config';
import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  dialect: 'mysql',
  schema: './src/database/schemas',
  out: './src/database/migrations',
  introspect: { casing: 'preserve' },
  dbCredentials: {
    url: process.env.DATABASE_URL ?? '',
  },
});
