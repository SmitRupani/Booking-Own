-- Initial schema for booking-own

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
