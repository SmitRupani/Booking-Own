import { Pool } from 'pg';

const connectionString = process.env.DATABASE_URL ?? 'postgres://booking_user:booking_password@localhost:5432/booking_own';
const pool = new Pool({ connectionString });

async function main() {
  const client = await pool.connect();

  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id serial PRIMARY KEY,
        clerk_id text NOT NULL,
        name text,
        email text,
        created_at timestamptz DEFAULT now() NOT NULL
      );

      CREATE TABLE IF NOT EXISTS resources (
        id serial PRIMARY KEY,
        name text NOT NULL,
        category text NOT NULL DEFAULT 'general',
        capacity integer DEFAULT 1 NOT NULL
      );

      CREATE TABLE IF NOT EXISTS bookings (
        id serial PRIMARY KEY,
        resource_id integer NOT NULL REFERENCES resources(id) ON DELETE CASCADE,
        user_id integer NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        start_at timestamptz NOT NULL,
        end_at timestamptz NOT NULL,
        created_at timestamptz DEFAULT now() NOT NULL
      );

      ALTER TABLE resources ADD COLUMN IF NOT EXISTS category text NOT NULL DEFAULT 'general';
    `);

    await client.query('TRUNCATE TABLE bookings, resources, users RESTART IDENTITY CASCADE;');

    await client.query(
      `INSERT INTO users (clerk_id, name, email)
       VALUES
         ($1, $2, $3),
         ($4, $5, $6)`,
      [
        'user_demo_001',
        'Aarav Sharma',
        'aarav@example.com',
        'user_demo_002',
        'Isha Verma',
        'isha@example.com',
      ],
    );

    await client.query(
      `INSERT INTO resources (name, category, capacity)
       VALUES
         ($1, $2, $3),
         ($4, $5, $6),
         ($7, $8, $9),
         ($10, $11, $12)`,
      [
        'Main Football Ground',
        'facility',
        22,
        'Study Room A',
        'room',
        8,
        'Badminton Kit 1',
        'equipment',
        4,
        'Conference Room 2',
        'room',
        12,
      ],
    );

    console.log('Database seeded successfully.');
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
