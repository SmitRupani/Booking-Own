import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';

let pool: Pool | undefined;
let dbInstance: ReturnType<typeof drizzle> | undefined;

export function getPool() {
  if (!pool) {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
      throw new Error('DATABASE_URL is not set. Set it in your environment to connect to Postgres.');
    }

    pool = new Pool({ connectionString });
  }

  return pool;
}

export function getDb() {
  if (!dbInstance) {
    dbInstance = drizzle(getPool());
  }

  return dbInstance;
}
