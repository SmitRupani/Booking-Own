import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  schema: 'src/lib/db/schema.ts',
  out: 'drizzle/migrations',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL || 'postgres://booking_user:booking_password@localhost:5432/booking_own',
  },
});
