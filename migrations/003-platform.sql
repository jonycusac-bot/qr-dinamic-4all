CREATE TABLE IF NOT EXISTS platform_administrators (
 identity_id text PRIMARY KEY,
 created_at timestamptz NOT NULL DEFAULT now()
);
