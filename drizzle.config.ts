import 'dotenv/config';
import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  dialect: 'mysql',
  schema: './src/database/schema/index.ts',
  out: './src/database/schema',
  introspect: { casing: 'preserve' },
  dbCredentials: {
    url: process.env.DATABASE_URL ?? '',
  },
});
