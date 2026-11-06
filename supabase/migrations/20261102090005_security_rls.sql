-- =============================================================================
-- 0005 · Security: app roles, PII posture, and the exposed API layer
-- -----------------------------------------------------------------------------
-- Student records are sensitive, so access is enforced in the database, not the
-- app. Layer strategy:
--   • raw / ops / core  → service_role only (ETL). Analysts never reach them.
--   • mart (matviews)   → service_role only; matviews can't carry RLS.
--   • api (this file)   → security-barrier views that scope rows by the caller's
--                         role + department, derived from app.user_profile.
-- Only the `api` schema is exposed through PostgREST (see config.toml).
-- =============================================================================

create schema if not exists app;
create schema if not exists api;

-- Lock the back layers away from the browser roles entirely.
revoke all on schema raw, ops, core, mart from anon, authenticated;
grant usage on schema api, app to anon, authenticated;

-- ─────────────────────── Who is this user? (profile) ────────────────────────
create table app.user_profile (
  user_id        uuid primary key references auth.users (id) on delete cascade,
  full_name      text,
  app_role       text not null default 'viewer'
                   check (app_role in ('super_admin','institutional_analyst','faculty_admin','viewer')),
  department_ids text[] not null default '{}',   -- scope for faculty_admin
  created_at     timestamptz not null default now()
);
alter table app.user_profile enable row level security;

-- A user may always read their own profile.
create policy user_reads_own_profile on app.user_profile
  for select to authenticated
  using (user_id = auth.uid());

-- Super admins may read/manage all profiles.
create policy super_admin_manages_profiles on app.user_profile
  for all to authenticated
  using (exists (select 1 from app.user_profile p
                 where p.user_id = auth.uid() and p.app_role = 'super_admin'))
  with check (exists (select 1 from app.user_profile p
                 where p.user_id = auth.uid() and p.app_role = 'super_admin'));

-- ───────────────── Helper functions (SECURITY DEFINER) ──────────────────────
-- Read the caller's role/scope regardless of RLS on user_profile.
create or replace function app.current_role()
returns text language sql stable security definer set search_path = app, public as $$
  select coalesce((select app_role from app.user_profile where user_id = auth.uid()), 'viewer');
$$;

create or replace function app.current_departments()
returns text[] language sql stable security definer set search_path = app, public as $$
  select coalesce((select department_ids from app.user_profile where user_id = auth.uid()), '{}');
$$;

-- True when the caller may see rows for the given department.
create or replace function app.can_see_department(dept text)
returns boolean language sql stable security definer set search_path = app, public as $$
  select app.current_role() in ('super_admin','institutional_analyst')
      or dept = any (app.current_departments());
$$;

-- ─────────────────── Exposed, row-scoped API views ──────────────────────────
-- security_barrier prevents a crafted predicate from leaking filtered rows.

-- Institutional KPI rollup — no person-level PII; scoped by department.
create view api.institutional_kpi
  with (security_barrier = true) as
  select * from mart.institutional_kpi k
  where app.can_see_department(k.department_id);

-- Enrollment facts — person-level; faculty_admin sees only their departments.
create view api.fact_enrollment
  with (security_barrier = true) as
  select * from mart.fact_enrollment f
  where app.can_see_department(f.department_id);

-- LMS engagement joined to department for scoping.
create view api.fact_lms_engagement
  with (security_barrier = true) as
  select l.*, c.department_id
  from mart.fact_lms_engagement l
  join core.course c on c.course_id = l.course_id
  where app.can_see_department(c.department_id);

-- Research output — less sensitive, still department-scoped.
create view api.fact_publication
  with (security_barrier = true) as
  select * from mart.fact_publication f
  where f.department_id is null or app.can_see_department(f.department_id);

-- A de-identified enrollment view for 'viewer' role: aggregate only, no person_id.
create view api.enrollment_summary
  with (security_barrier = true) as
  select academic_year, semester, department_id, program, study_level, status,
         count(*) as n, round(avg(grade_points),2) as avg_gpa
  from mart.fact_enrollment f
  where app.can_see_department(f.department_id)
  group by academic_year, semester, department_id, program, study_level, status;

-- Shared dimensions (safe to read broadly).
create view api.dim_department as select * from mart.dim_department;
create view api.dim_course     as select * from mart.dim_course;
create view api.dim_term       as select * from mart.dim_term;
create view api.dim_date       as select * from mart.dim_date;

-- ─────────────────────────────── Grants ─────────────────────────────────────
grant select on all tables in schema api to authenticated;
alter default privileges in schema api grant select on tables to authenticated;
grant execute on all functions in schema app to authenticated;

-- Auto-provision a profile row when a new auth user signs up.
create or replace function app.handle_new_user()
returns trigger language plpgsql security definer set search_path = app, auth as $$
begin
  insert into app.user_profile (user_id, full_name)
  values (new.id, new.raw_user_meta_data ->> 'full_name')
  on conflict (user_id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function app.handle_new_user();
