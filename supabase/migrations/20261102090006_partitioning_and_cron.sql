-- =============================================================================
-- 0006 · LMS partition maintenance + nightly batch schedule (pg_cron)
-- -----------------------------------------------------------------------------
-- A self-contained monthly-partition maintainer (no pg_partman version coupling)
-- and the scheduled jobs that run the batch refresh. All times are UTC — adjust
-- for CAT (UTC+2) when choosing hours.
-- =============================================================================

-- ─────────────── Monthly partition maintainer for core.lms_activity ─────────
-- Ensures a partition exists for a given month; idempotent.
create or replace function core.ensure_lms_partition(p_month date)
returns void
language plpgsql
as $$
declare
  start_ts  timestamptz := date_trunc('month', p_month);
  end_ts    timestamptz := date_trunc('month', p_month) + interval '1 month';
  part_name text := format('lms_activity_%s', to_char(start_ts, 'YYYY_MM'));
begin
  if not exists (
    select 1 from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'core' and c.relname = part_name
  ) then
    execute format(
      'create table core.%I partition of core.lms_activity for values from (%L) to (%L)',
      part_name, start_ts, end_ts
    );
  end if;
end;
$$;

-- Keep current month + next 2 months provisioned ahead of loads.
create or replace function core.maintain_lms_partitions()
returns void
language plpgsql
as $$
declare
  m int;
begin
  for m in 0..2 loop
    perform core.ensure_lms_partition((date_trunc('month', now()) + (m || ' month')::interval)::date);
  end loop;
end;
$$;

-- Provision the initial window immediately.
select core.maintain_lms_partitions();

-- ─────────────────────────── Scheduled jobs ─────────────────────────────────
-- pg_cron.schedule(job_name, cron_expr, sql). Jobs are idempotent to re-run.

-- 1) Roll partitions forward — 1st of each month, 00:05 UTC.
select cron.schedule(
  'maintain-lms-partitions',
  '5 0 1 * *',
  $$select core.maintain_lms_partitions();$$
);

-- 2) Refresh all marts — nightly 02:30 UTC (04:30 CAT), after ETL has landed data.
--    The batch loader advances watermarks and populates raw/core before this.
select cron.schedule(
  'refresh-marts-nightly',
  '30 2 * * *',
  $$select mart.refresh_all(true);$$
);

-- To inspect jobs:   select * from cron.job;
-- To see run history: select * from cron.job_run_details order by start_time desc;
