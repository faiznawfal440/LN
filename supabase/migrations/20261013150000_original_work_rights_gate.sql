ALTER TABLE public.volume_permissions
  ADD COLUMN IF NOT EXISTS original_rights_holder text,
  ADD COLUMN IF NOT EXISTS original_rights_scope text,
  ADD COLUMN IF NOT EXISTS original_rights_reference text,
  ADD COLUMN IF NOT EXISTS original_rights_status text NOT NULL DEFAULT 'pending'
    CHECK (original_rights_status IN ('pending','approved','revoked'));
