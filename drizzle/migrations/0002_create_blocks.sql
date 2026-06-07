-- Create blocks table for admin-managed closed times
CREATE TABLE IF NOT EXISTS blocks (
  id serial PRIMARY KEY,
  resource_id integer NOT NULL REFERENCES resources(id) ON DELETE CASCADE,
  start_at timestamptz NOT NULL,
  end_at timestamptz NOT NULL,
  reason text,
  created_by integer,
  created_at timestamptz DEFAULT now() NOT NULL
);

-- Optional index to speed queries by resource and time
CREATE INDEX IF NOT EXISTS idx_blocks_resource_start ON blocks(resource_id, start_at);
