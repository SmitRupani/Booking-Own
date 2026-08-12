import pg from 'pg';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const { Pool } = pg;

async function syncSchema() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL || 'postgres://booking_user:booking_password@localhost:5432/booking_own',
  });

  const client = await pool.connect();

  try {
    console.log('Synchronizing PostgreSQL schema with Drizzle definitions...');

    // 1. Users Table
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id serial PRIMARY KEY,
        clerk_id text UNIQUE,
        name text NOT NULL,
        email text NOT NULL UNIQUE,
        role text DEFAULT 'STUDENT' NOT NULL,
        image text,
        password text,
        penalty_points integer DEFAULT 0 NOT NULL,
        suspended_until timestamp,
        suspension_level integer DEFAULT 0 NOT NULL,
        blocked boolean DEFAULT false NOT NULL,
        blocked_at timestamp,
        blocked_by text,
        created_at timestamp DEFAULT now() NOT NULL,
        updated_at timestamp DEFAULT now() NOT NULL
      );

      ALTER TABLE users ADD COLUMN IF NOT EXISTS clerk_id text;
      ALTER TABLE users ADD COLUMN IF NOT EXISTS role text DEFAULT 'STUDENT' NOT NULL;
      ALTER TABLE users ADD COLUMN IF NOT EXISTS image text;
      ALTER TABLE users ADD COLUMN IF NOT EXISTS password text;
      ALTER TABLE users ADD COLUMN IF NOT EXISTS penalty_points integer DEFAULT 0 NOT NULL;
      ALTER TABLE users ADD COLUMN IF NOT EXISTS suspended_until timestamp;
      ALTER TABLE users ADD COLUMN IF NOT EXISTS suspension_level integer DEFAULT 0 NOT NULL;
      ALTER TABLE users ADD COLUMN IF NOT EXISTS blocked boolean DEFAULT false NOT NULL;
      ALTER TABLE users ADD COLUMN IF NOT EXISTS blocked_at timestamp;
      ALTER TABLE users ADD COLUMN IF NOT EXISTS blocked_by text;
      ALTER TABLE users ADD COLUMN IF NOT EXISTS updated_at timestamp DEFAULT now() NOT NULL;
    `);

    // 2. Resources Table
    await client.query(`
      CREATE TABLE IF NOT EXISTS resources (
        id serial PRIMARY KEY,
        name text NOT NULL,
        category text DEFAULT 'general' NOT NULL,
        type text,
        location text,
        capacity integer DEFAULT 1 NOT NULL,
        description text,
        image_url text,
        rules jsonb DEFAULT '{}' NOT NULL,
        shared_group_id text,
        status text DEFAULT 'ACTIVE' NOT NULL,
        operating_hours jsonb,
        created_at timestamp DEFAULT now() NOT NULL,
        updated_at timestamp DEFAULT now() NOT NULL
      );

      ALTER TABLE resources ADD COLUMN IF NOT EXISTS category text DEFAULT 'general' NOT NULL;
      ALTER TABLE resources ADD COLUMN IF NOT EXISTS type text;
      ALTER TABLE resources ADD COLUMN IF NOT EXISTS location text;
      ALTER TABLE resources ADD COLUMN IF NOT EXISTS capacity integer DEFAULT 1 NOT NULL;
      ALTER TABLE resources ADD COLUMN IF NOT EXISTS description text;
      ALTER TABLE resources ADD COLUMN IF NOT EXISTS image_url text;
      ALTER TABLE resources ADD COLUMN IF NOT EXISTS rules jsonb DEFAULT '{}' NOT NULL;
      ALTER TABLE resources ADD COLUMN IF NOT EXISTS shared_group_id text;
      ALTER TABLE resources ADD COLUMN IF NOT EXISTS status text DEFAULT 'ACTIVE' NOT NULL;
      ALTER TABLE resources ADD COLUMN IF NOT EXISTS operating_hours jsonb;
      ALTER TABLE resources ADD COLUMN IF NOT EXISTS updated_at timestamp DEFAULT now() NOT NULL;
    `);

    // 3. Equipment Items Table
    await client.query(`
      CREATE TABLE IF NOT EXISTS equipment_items (
        id serial PRIMARY KEY,
        resource_id integer NOT NULL REFERENCES resources(id) ON DELETE CASCADE,
        name text NOT NULL,
        description text,
        qty_total integer NOT NULL,
        qty_available integer NOT NULL,
        qty_reserved integer DEFAULT 0 NOT NULL,
        image_url text,
        safety boolean DEFAULT false NOT NULL,
        restricted boolean DEFAULT false NOT NULL,
        requires_approval boolean DEFAULT false NOT NULL,
        sport_category text,
        lab_category text,
        isbn text,
        author text,
        created_at timestamp DEFAULT now() NOT NULL,
        updated_at timestamp DEFAULT now() NOT NULL
      );

      ALTER TABLE equipment_items ADD COLUMN IF NOT EXISTS qty_reserved integer DEFAULT 0 NOT NULL;
      ALTER TABLE equipment_items ADD COLUMN IF NOT EXISTS safety boolean DEFAULT false NOT NULL;
      ALTER TABLE equipment_items ADD COLUMN IF NOT EXISTS restricted boolean DEFAULT false NOT NULL;
      ALTER TABLE equipment_items ADD COLUMN IF NOT EXISTS requires_approval boolean DEFAULT false NOT NULL;
      ALTER TABLE equipment_items ADD COLUMN IF NOT EXISTS sport_category text;
      ALTER TABLE equipment_items ADD COLUMN IF NOT EXISTS lab_category text;
      ALTER TABLE equipment_items ADD COLUMN IF NOT EXISTS isbn text;
      ALTER TABLE equipment_items ADD COLUMN IF NOT EXISTS author text;
      ALTER TABLE equipment_items ADD COLUMN IF NOT EXISTS updated_at timestamp DEFAULT now() NOT NULL;
    `);

    // 4. Bookings Table
    await client.query(`
      CREATE TABLE IF NOT EXISTS bookings (
        id serial PRIMARY KEY,
        user_id integer NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        resource_id integer NOT NULL REFERENCES resources(id) ON DELETE CASCADE,
        kind text DEFAULT 'FACILITY' NOT NULL,
        items jsonb,
        start_at timestamp NOT NULL,
        end_at timestamp NOT NULL,
        status text DEFAULT 'CONFIRMED' NOT NULL,
        requires_approval boolean DEFAULT false NOT NULL,
        approval text DEFAULT 'NOT_REQUIRED' NOT NULL,
        approved_by text,
        approved_at timestamp,
        qr_issued boolean DEFAULT false NOT NULL,
        qr_token text,
        checked_in_at timestamp,
        returned_at timestamp,
        condition text,
        approval_email_sent boolean DEFAULT false NOT NULL,
        approval_email_sent_at timestamp,
        approval_email_error text,
        rejection_reason text,
        borrow_reason text,
        reschedule_count integer DEFAULT 0 NOT NULL,
        extension_count integer DEFAULT 0 NOT NULL,
        reschedule_history jsonb DEFAULT '[]',
        override_by text,
        override_at timestamp,
        override_reason text,
        created_at timestamp DEFAULT now() NOT NULL,
        updated_at timestamp DEFAULT now() NOT NULL
      );

      ALTER TABLE bookings ADD COLUMN IF NOT EXISTS kind text DEFAULT 'FACILITY' NOT NULL;
      ALTER TABLE bookings ADD COLUMN IF NOT EXISTS items jsonb;
      ALTER TABLE bookings ADD COLUMN IF NOT EXISTS status text DEFAULT 'CONFIRMED' NOT NULL;
      ALTER TABLE bookings ADD COLUMN IF NOT EXISTS requires_approval boolean DEFAULT false NOT NULL;
      ALTER TABLE bookings ADD COLUMN IF NOT EXISTS approval text DEFAULT 'NOT_REQUIRED' NOT NULL;
      ALTER TABLE bookings ADD COLUMN IF NOT EXISTS approved_by text;
      ALTER TABLE bookings ADD COLUMN IF NOT EXISTS approved_at timestamp;
      ALTER TABLE bookings ADD COLUMN IF NOT EXISTS qr_issued boolean DEFAULT false NOT NULL;
      ALTER TABLE bookings ADD COLUMN IF NOT EXISTS qr_token text;
      ALTER TABLE bookings ADD COLUMN IF NOT EXISTS checked_in_at timestamp;
      ALTER TABLE bookings ADD COLUMN IF NOT EXISTS returned_at timestamp;
      ALTER TABLE bookings ADD COLUMN IF NOT EXISTS condition text;
      ALTER TABLE bookings ADD COLUMN IF NOT EXISTS approval_email_sent boolean DEFAULT false NOT NULL;
      ALTER TABLE bookings ADD COLUMN IF NOT EXISTS approval_email_sent_at timestamp;
      ALTER TABLE bookings ADD COLUMN IF NOT EXISTS approval_email_error text;
      ALTER TABLE bookings ADD COLUMN IF NOT EXISTS rejection_reason text;
      ALTER TABLE bookings ADD COLUMN IF NOT EXISTS borrow_reason text;
      ALTER TABLE bookings ADD COLUMN IF NOT EXISTS reschedule_count integer DEFAULT 0 NOT NULL;
      ALTER TABLE bookings ADD COLUMN IF NOT EXISTS extension_count integer DEFAULT 0 NOT NULL;
      ALTER TABLE bookings ADD COLUMN IF NOT EXISTS reschedule_history jsonb DEFAULT '[]';
      ALTER TABLE bookings ADD COLUMN IF NOT EXISTS override_by text;
      ALTER TABLE bookings ADD COLUMN IF NOT EXISTS override_at timestamp;
      ALTER TABLE bookings ADD COLUMN IF NOT EXISTS override_reason text;
      ALTER TABLE bookings ADD COLUMN IF NOT EXISTS updated_at timestamp DEFAULT now() NOT NULL;
    `);

    // 5. Blocks Table
    await client.query(`
      CREATE TABLE IF NOT EXISTS blocks (
        id serial PRIMARY KEY,
        resource_id integer NOT NULL REFERENCES resources(id) ON DELETE CASCADE,
        start_at timestamp NOT NULL,
        end_at timestamp NOT NULL,
        reason text NOT NULL,
        type text DEFAULT 'MAINTENANCE' NOT NULL,
        created_by integer REFERENCES users(id),
        recurring_group_id text,
        recurring_pattern text,
        created_at timestamp DEFAULT now() NOT NULL
      );

      ALTER TABLE blocks ADD COLUMN IF NOT EXISTS type text DEFAULT 'MAINTENANCE' NOT NULL;
      ALTER TABLE blocks ADD COLUMN IF NOT EXISTS created_by integer;
      ALTER TABLE blocks ADD COLUMN IF NOT EXISTS recurring_group_id text;
      ALTER TABLE blocks ADD COLUMN IF NOT EXISTS recurring_pattern text;
    `);

    // 6. Group Bookings Table
    await client.query(`
      CREATE TABLE IF NOT EXISTS group_bookings (
        id serial PRIMARY KEY,
        booking_id integer NOT NULL REFERENCES bookings(id) ON DELETE CASCADE UNIQUE,
        organizer_id integer NOT NULL REFERENCES users(id),
        organizer_email text NOT NULL,
        members jsonb NOT NULL,
        required_minimum integer DEFAULT 6 NOT NULL,
        confirmed_count integer DEFAULT 1 NOT NULL,
        status text DEFAULT 'PENDING_CONFIRMATIONS' NOT NULL,
        expires_at timestamp NOT NULL,
        created_at timestamp DEFAULT now() NOT NULL,
        updated_at timestamp DEFAULT now() NOT NULL
      );
    `);

    // 7. Penalties Table
    await client.query(`
      CREATE TABLE IF NOT EXISTS penalties (
        id serial PRIMARY KEY,
        user_id integer NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        booking_id integer REFERENCES bookings(id) ON DELETE SET NULL,
        reason text NOT NULL,
        points integer DEFAULT 1 NOT NULL,
        type text DEFAULT 'LATE_RETURN' NOT NULL,
        status text DEFAULT 'ACTIVE' NOT NULL,
        served boolean DEFAULT false NOT NULL,
        waived_by integer REFERENCES users(id),
        waived_at timestamp,
        waive_reason text,
        appeal_status text,
        appeal_reason text,
        appeal_submitted_at timestamp,
        appeal_reviewed_by integer REFERENCES users(id),
        appeal_reviewed_at timestamp,
        appeal_review_notes text,
        created_at timestamp DEFAULT now() NOT NULL
      );
    `);

    // 8. QR Tokens Table
    await client.query(`
      CREATE TABLE IF NOT EXISTS qr_tokens (
        id serial PRIMARY KEY,
        booking_id integer NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
        user_id integer NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        token text NOT NULL UNIQUE,
        token_hash text,
        used boolean DEFAULT false NOT NULL,
        used_at timestamp,
        expires_at timestamp NOT NULL,
        created_at timestamp DEFAULT now() NOT NULL
      );
    `);

    // 9. Approval Tokens Table
    await client.query(`
      CREATE TABLE IF NOT EXISTS approval_tokens (
        id serial PRIMARY KEY,
        booking_id integer NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
        token text NOT NULL UNIQUE,
        action text NOT NULL,
        expires_at timestamp NOT NULL,
        created_at timestamp DEFAULT now() NOT NULL
      );
    `);

    // 10. Audit Logs Table
    await client.query(`
      CREATE TABLE IF NOT EXISTS audit_logs (
        id serial PRIMARY KEY,
        action text NOT NULL,
        actor_id integer,
        actor_name text,
        target_type text,
        target_id integer,
        message text,
        details jsonb,
        created_at timestamp DEFAULT now() NOT NULL
      );
    `);

    // 11. Email Routing Table
    await client.query(`
      CREATE TABLE IF NOT EXISTS email_routing (
        id serial PRIMARY KEY,
        category text NOT NULL UNIQUE,
        emails jsonb DEFAULT '[]' NOT NULL,
        created_at timestamp DEFAULT now() NOT NULL,
        updated_at timestamp DEFAULT now() NOT NULL
      );
    `);

    // 12. System Policies Table
    await client.query(`
      CREATE TABLE IF NOT EXISTS system_policies (
        id serial PRIMARY KEY,
        key text NOT NULL UNIQUE,
        value jsonb NOT NULL,
        description text,
        created_at timestamp DEFAULT now() NOT NULL,
        updated_at timestamp DEFAULT now() NOT NULL
      );
    `);

    // 13. Campus Hours Table
    await client.query(`
      CREATE TABLE IF NOT EXISTS campus_hours (
        id serial PRIMARY KEY,
        day_of_week integer NOT NULL UNIQUE,
        open_time text DEFAULT '06:00' NOT NULL,
        close_time text DEFAULT '22:00' NOT NULL,
        is_closed boolean DEFAULT false NOT NULL
      );
    `);

    console.log('✅ PostgreSQL schema successfully synchronized with Drizzle ORM models!');
  } catch (err) {
    console.error('Error synchronizing database schema:', err);
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

syncSchema();
