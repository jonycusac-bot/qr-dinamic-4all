ALTER TABLE tenant_invitations ADD COLUMN IF NOT EXISTS name text NOT NULL DEFAULT '' CHECK(char_length(name)<=100);
