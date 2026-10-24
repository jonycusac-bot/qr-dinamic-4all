CREATE TABLE IF NOT EXISTS tenant_invitations (
 id uuid PRIMARY KEY, company_id uuid NOT NULL REFERENCES tenant_companies(id) ON DELETE CASCADE,
 email text NOT NULL, role text NOT NULL CHECK(role IN ('admin','member','viewer')),
 token_hash text NOT NULL UNIQUE, created_by text NOT NULL, created_at timestamptz NOT NULL DEFAULT now(),
 expires_at timestamptz NOT NULL, accepted_at timestamptz, accepted_by text, revoked_at timestamptz
);
CREATE INDEX IF NOT EXISTS tenant_invitations_company_idx ON tenant_invitations(company_id,created_at);
