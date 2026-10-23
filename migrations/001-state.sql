-- Compatible with the existing Neon data. No records are removed or reseeded.
CREATE TABLE IF NOT EXISTS qr_app_state (
  id integer PRIMARY KEY,
  state jsonb NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE qr_app_state ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();
