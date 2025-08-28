import type { Config } from 'drizzle-kit';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

export default {
  dialect: 'postgresql',
  schema: './lib/database/schema.ts',
  out: './lib/database/migrations',
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
} satisfies Config;
