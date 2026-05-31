// Lightweight Drizzle client skeleton — configure with DATABASE_URL
import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';

// Use a process-global singleton to avoid exhausting connections in dev/hot-reload.
declare global {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  var __pgPool: any;
}

if (!process.env.DATABASE_URL) {
  // Fail fast with a clear error when DATABASE_URL is missing.
  // Some serverless environments rely on this env var being present at build/runtime.
  throw new Error('DATABASE_URL is not set. Set it in your environment to connect to Postgres.');
}

const pool: Pool = global.__pgPool ?? new Pool({ connectionString: process.env.DATABASE_URL });
if (!global.__pgPool) global.__pgPool = pool;

export const db = drizzle(pool);

// Export raw pool for migrations / scripts
export { pool };
