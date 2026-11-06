-- =============================================================================
-- 0002 · RAW landing layer + ETL bookkeeping
-- -----------------------------------------------------------------------------
-- One uniform landing table for every source. Adding a new source (e.g. a new
-- API) needs zero DDL — just a new (source, entity_type) pair. The verbatim
-- JSONB payload means we can re-run transforms without re-hitting the APIs.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- ops.etl_run — one row per ETL batch execution (the orchestration audit trail).
-- -----------------------------------------------------------------------------
create table ops.etl_run (
  run_id        uuid primary key default extensions.gen_random_uuid(),
  source        text not null,
  entity_type   text not null,
  status        text not null default 'running'
                  check (status in ('running','succeeded','failed','partial')),
  started_at    timestamptz not null default now(),
  finished_at   timestamptz,
  rows_read     bigint default 0,
  rows_loaded   bigint default 0,
  error_detail  text
);
create index on ops.etl_run (source, entity_type, started_at desc);

-- -----------------------------------------------------------------------------
-- ops.load_watermark — incremental-load cursor per (source, entity_type).
-- Batch jobs read last_value, pull only newer records, then advance it.
-- -----------------------------------------------------------------------------
create table ops.load_watermark (
  source        text not null,
  entity_type   text not null,
  last_value    text,                 -- max updated_at / max id seen, as text
  last_run_at   timestamptz,
  rows_loaded   bigint default 0,
  primary key (source, entity_type)
);

-- -----------------------------------------------------------------------------
-- raw.ingest — the universal landing table.
-- -----------------------------------------------------------------------------
create table raw.ingest (
  id            bigint generated always as identity primary key,
  run_id        uuid references ops.etl_run (run_id),
  source        text not null,        -- 'orcid','openalex','moodle','sis','dspace','ojs','scholar'
  entity_type   text not null,        -- 'work','author','course','enrollment','activity','result'
  source_key    text,                 -- the record's native primary id
  payload       jsonb not null,       -- the record, exactly as received
  content_hash  text generated always as (encode(extensions.digest(payload::text, 'sha256'), 'hex')) stored,
  ingested_at   timestamptz not null default now()
);

-- Natural-key lookup for upserts / dedupe during transform.
create index raw_ingest_source_key_idx on raw.ingest (source, entity_type, source_key);
-- GIN over the payload so transforms can query arbitrary JSON paths efficiently.
create index raw_ingest_payload_gin_idx on raw.ingest using gin (payload);
-- Only-changed detection: skip re-landing identical payloads.
create index raw_ingest_hash_idx on raw.ingest (source, entity_type, content_hash);

comment on table raw.ingest is
  'Universal landing table. One row = one source record, payload verbatim. Replayable.';
comment on column raw.ingest.content_hash is
  'SHA-256 of payload; lets the loader detect unchanged records and skip no-op writes.';
