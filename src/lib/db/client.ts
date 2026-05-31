// Lightweight Drizzle client skeleton — configure with DATABASE_URL
import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';

// NOTE: keep this file minimal. Replace the pool config with secure env handling.
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

export const db = drizzle(pool);

// Export raw pool for migrations / scripts
export { pool };
