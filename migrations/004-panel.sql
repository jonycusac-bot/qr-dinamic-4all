ALTER TABLE tenant_qr_projects ADD COLUMN IF NOT EXISTS details jsonb NOT NULL DEFAULT '{}';
ALTER TABLE tenant_scan_events ADD COLUMN IF NOT EXISTS details jsonb NOT NULL DEFAULT '{}';
