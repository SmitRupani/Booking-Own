-- Create audit_logs table for system audit events
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

CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action_created_at ON audit_logs(action, created_at DESC);
