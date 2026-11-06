-- =============================================================================
-- 0004 · MART presentation layer (star schemas for dashboards)
-- -----------------------------------------------------------------------------
-- Materialized views over `core`, refreshed at the end of each batch run.
-- Dashboards point here exclusively. Every matview gets a UNIQUE index so it can
-- be refreshed CONCURRENTLY (no read-lock on the dashboards during refresh).
-- =============================================================================

-- ─────────────────────────── Conformed date dim ─────────────────────────────
create table mart.dim_date (
  date_key     int primary key,          -- yyyymmdd
  date         date not null unique,
  year         int not null,
  quarter      int not null,
  month        int not null,
  month_name   text not null,
  day          int not null,
  day_of_week  int not null,
  is_weekend   boolean not null
);

insert into mart.dim_date
select
  (extract(year from d)*10000 + extract(month from d)*100 + extract(day from d))::int,
  d::date,
  extract(year from d)::int,
  extract(quarter from d)::int,
  extract(month from d)::int,
  to_char(d, 'Mon'),
  extract(day from d)::int,
  extract(isodow from d)::int,
  extract(isodow from d) in (6,7)
from generate_series(date '2015-01-01', date '2035-12-31', interval '1 day') d;

-- ───────────────────────────── Dimensions ───────────────────────────────────
-- Lightweight views for dims that don't need materialization.
create view mart.dim_person as
select person_id, display_name, full_name, kind, primary_email
from core.person;

create view mart.dim_department as
select department_id, name, school
from core.department
where is_current;

create view mart.dim_course as
select course_id, code, title, department_id, credits
from core.course;

create view mart.dim_term as
select term_id, academic_year, semester, start_date, end_date
from core.academic_term;

-- ───────────────── FACT · enrollment (teaching backbone) ────────────────────
create materialized view mart.fact_enrollment as
select
  e.enrollment_id,
  e.person_id,
  e.course_id,
  e.term_id,
  c.department_id,
  t.academic_year,
  t.semester,
  s.program,
  s.study_level,
  s.year_of_study,
  e.status,
  e.grade,
  e.grade_points,
  e.credits
from core.enrollment e
join core.course c         on c.course_id = e.course_id
join core.academic_term t  on t.term_id   = e.term_id
left join core.student_enrollment_status s
       on s.person_id = e.person_id and s.is_current;
create unique index fact_enrollment_pk on mart.fact_enrollment (enrollment_id);
create index fact_enrollment_term_dept_idx on mart.fact_enrollment (academic_year, department_id);

-- ───────────────── FACT · LMS engagement (per person/course/term) ───────────
create materialized view mart.fact_lms_engagement as
select
  a.person_id,
  a.course_id,
  a.term_id,
  count(*)                                             as event_count,
  count(*) filter (where a.event_type = 'submission')  as submissions,
  count(*) filter (where a.event_type = 'quiz_attempt')as quiz_attempts,
  count(distinct a.event_time::date)                   as active_days,
  coalesce(sum(a.duration_sec),0)                      as total_seconds,
  max(a.event_time)                                    as last_seen
from core.lms_activity a
group by a.person_id, a.course_id, a.term_id;
create unique index fact_lms_engagement_pk
  on mart.fact_lms_engagement (person_id, course_id, term_id);

-- ───────────────── FACT · publication (research output) ─────────────────────
create materialized view mart.fact_publication as
select
  p.publication_id,
  p.title,
  p.type,
  p.pub_year,
  p.venue_id,
  v.name                as venue_name,
  v.is_unza_journal,
  p.is_open_access,
  p.cited_by_count,
  au.person_id,
  aff.department_id
from core.publication p
join core.authorship au    on au.publication_id = p.publication_id
left join core.venue v     on v.venue_id = p.venue_id
left join core.person_affiliation aff
       on aff.person_id = au.person_id and aff.is_current;
create unique index fact_publication_pk
  on mart.fact_publication (publication_id, person_id);
create index fact_publication_year_idx on mart.fact_publication (pub_year, department_id);

-- ───────────────── Institutional KPI rollup (the exec dashboard) ─────────────
-- Combines teaching + research into one grain: (academic_year, department).
create materialized view mart.institutional_kpi as
with enroll as (
  select academic_year, department_id,
         count(distinct person_id)                                  as headcount,
         count(*) filter (where status = 'completed')               as completions,
         count(*) filter (where status = 'dropped')                 as drops,
         avg(grade_points)                                          as avg_gpa
  from mart.fact_enrollment
  group by academic_year, department_id
),
lms as (
  select t.academic_year, c.department_id,
         count(distinct l.person_id)                                as lms_active_students
  from mart.fact_lms_engagement l
  join core.academic_term t on t.term_id = l.term_id
  join core.course c        on c.course_id = l.course_id
  group by t.academic_year, c.department_id
),
research as (
  select pub_year as academic_year, department_id,
         count(distinct publication_id)                             as publications,
         sum(cited_by_count)                                        as citations,
         avg((is_open_access)::int)::numeric(4,3)                   as pct_open_access
  from mart.fact_publication
  group by pub_year, department_id
)
select
  coalesce(e.academic_year, r.academic_year)   as academic_year,
  coalesce(e.department_id, r.department_id)   as department_id,
  e.headcount,
  e.completions,
  e.drops,
  case when e.headcount > 0
       then round(e.drops::numeric / e.headcount, 3) end           as dropout_rate,
  round(e.avg_gpa, 2)                           as avg_gpa,
  l.lms_active_students,
  r.publications,
  r.citations,
  r.pct_open_access
from enroll e
full outer join research r
  on r.academic_year = e.academic_year and r.department_id = e.department_id
left join lms l
  on l.academic_year = coalesce(e.academic_year, r.academic_year)
 and l.department_id = coalesce(e.department_id, r.department_id);
create unique index institutional_kpi_pk
  on mart.institutional_kpi (academic_year, department_id);

-- ───────────────── One-call refresh for the batch orchestrator ──────────────
create or replace function mart.refresh_all(p_concurrently boolean default true)
returns void
language plpgsql
as $$
declare
  mv text;
begin
  for mv in
    select format('%I.%I', schemaname, matviewname)
    from pg_matviews where schemaname = 'mart'
  loop
    if p_concurrently then
      execute format('refresh materialized view concurrently %s', mv);
    else
      execute format('refresh materialized view %s', mv);
    end if;
  end loop;
end;
$$;

comment on function mart.refresh_all is
  'Refresh every mart materialized view. Call at end of nightly batch (pg_cron, see 0006).';
