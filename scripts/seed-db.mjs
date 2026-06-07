import { Pool } from 'pg';

const connectionString = process.env.DATABASE_URL ?? 'postgres://booking_user:booking_password@localhost:5432/booking_own';
const pool = new Pool({ connectionString });

const seedTarget = process.argv[2] ?? 'all';

function shiftDate({ days = 0, hours = 0, minutes = 0 }) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  date.setHours(date.getHours() + hours);
  date.setMinutes(date.getMinutes() + minutes);
  return date.toISOString();
}

function fixedTime(daysFromToday, hours, minutes = 0) {
  const date = new Date();
  date.setDate(date.getDate() + daysFromToday);
  date.setHours(hours, minutes, 0, 0);
  return date.toISOString();
}

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

      CREATE TABLE IF NOT EXISTS blocks (
        id serial PRIMARY KEY,
        resource_id integer NOT NULL REFERENCES resources(id) ON DELETE CASCADE,
        start_at timestamptz NOT NULL,
        end_at timestamptz NOT NULL,
        reason text,
        created_by integer,
        created_at timestamptz DEFAULT now() NOT NULL
      );

      CREATE TABLE IF NOT EXISTS audit_logs (
        id serial PRIMARY KEY,
        action text NOT NULL,
        actor_id integer,
        actor_name text,
        target_type text,
        target_id integer,
        message text,
        created_at timestamptz DEFAULT now() NOT NULL
      );

      ALTER TABLE resources ADD COLUMN IF NOT EXISTS category text NOT NULL DEFAULT 'general';
    `);

    await client.query('TRUNCATE TABLE audit_logs, blocks, bookings, resources, users RESTART IDENTITY CASCADE;');

    console.log(`Seeding ${seedTarget} fixtures...`);

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
         ($10, $11, $12),
         ($13, $14, $15),
         ($16, $17, $18)`,
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
        'Tennis Racket Set',
        'equipment',
        8,
        'Lab Microscope Kit',
        'equipment',
        6,
      ],
    );

    await client.query(
      `INSERT INTO bookings (resource_id, user_id, start_at, end_at)
       VALUES
         ($1, $2, $3, $4),
         ($5, $6, $7, $8),
         ($9, $10, $11, $12),
         ($13, $14, $15, $16)`,
      [
        1,
        1,
        fixedTime(-3, 9),
        fixedTime(-3, 11),
        2,
        2,
        shiftDate({ hours: -2 }),
        shiftDate({ hours: 1 }),
        3,
        1,
        fixedTime(1, 14),
        fixedTime(1, 16),
        4,
        2,
        fixedTime(2, 10),
        fixedTime(2, 12),
      ],
    );

    // Blocks are admin-managed closed times for resources
    await client.query(
      `INSERT INTO blocks (resource_id, start_at, end_at, reason)
       VALUES
         ($1, $2, $3, $4),
         ($5, $6, $7, $8)`,
      [
        1,
        fixedTime(0, 12),
        fixedTime(0, 14),
        'Maintenance window',
        2,
        fixedTime(3, 8),
        fixedTime(3, 12),
        'Reserved for tournament',
      ],
    );

    // Seed some audit logs so admin/audit-logs has data to show
    await client.query(
      `INSERT INTO audit_logs (action, actor_id, actor_name, target_type, target_id, message)
       VALUES
         ($1, $2, $3, $4, $5, $6),
         ($7, $8, $9, $10, $11, $12)`,
      [
        'CREATE_RESOURCE',
        1,
        'Aarav Sharma',
        'resource',
        1,
        'Created resource Main Football Ground',
        'CREATE_BOOKING',
        2,
        'Isha Verma',
        'booking',
        2,
        'Created booking for Study Room A',
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
