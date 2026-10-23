-- Stage 1: new tables only. The existing qr_app_state and its QR URLs stay intact.
-- Identity IDs will come from the verified authentication provider, never a browser field.
CREATE TABLE IF NOT EXISTS tenant_companies (
  id uuid PRIMARY KEY,
  name text NOT NULL CHECK (char_length(btrim(name)) BETWEEN 1 AND 60),
  logo_url text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'suspended')),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS tenant_memberships (
  company_id uuid NOT NULL REFERENCES tenant_companies(id) ON DELETE CASCADE,
  identity_id text NOT NULL CHECK (char_length(identity_id) BETWEEN 1 AND 200),
  role text NOT NULL CHECK (role IN ('owner','admin','member','viewer')),
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (company_id, identity_id)
);
CREATE INDEX IF NOT EXISTS tenant_memberships_identity_idx ON tenant_memberships(identity_id);
CREATE TABLE IF NOT EXISTS tenant_qr_projects (
  id uuid PRIMARY KEY,
  company_id uuid NOT NULL REFERENCES tenant_companies(id) ON DELETE CASCADE,
  short_code text NOT NULL CHECK (short_code ~ '^[a-z0-9_-]{1,100}$'),
  name text NOT NULL CHECK (char_length(btrim(name)) BETWEEN 1 AND 200),
  destination_url text NOT NULL,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','paused','archived')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (short_code),
  UNIQUE (company_id,id)
);
CREATE INDEX IF NOT EXISTS tenant_qr_company_idx ON tenant_qr_projects(company_id,created_at);
CREATE TABLE IF NOT EXISTS tenant_scan_events (
  id uuid PRIMARY KEY,
  company_id uuid NOT NULL,
  project_id uuid NOT NULL,
  scanned_at timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY (company_id,project_id) REFERENCES tenant_qr_projects(company_id,id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS tenant_scans_company_idx ON tenant_scan_events(company_id,scanned_at);
