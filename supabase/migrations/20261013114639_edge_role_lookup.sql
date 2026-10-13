-- Internal role lookup for Edge Functions without exposing the private schema to the Data API.
CREATE OR REPLACE FUNCTION public.lumen_get_user_role(p_user_id uuid)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT r.role::text FROM private.user_roles r WHERE r.user_id = p_user_id;
$$;
REVOKE ALL ON FUNCTION public.lumen_get_user_role(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.lumen_get_user_role(uuid) TO service_role;
