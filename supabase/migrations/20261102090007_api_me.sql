-- =============================================================================
-- 0007 · api.me — the caller's own profile (role + scope) for the app header.
-- =============================================================================
create view api.me
  with (security_barrier = true) as
  select p.user_id, p.full_name, p.app_role, p.department_ids
  from app.user_profile p
  where p.user_id = auth.uid();

grant select on api.me to authenticated;
