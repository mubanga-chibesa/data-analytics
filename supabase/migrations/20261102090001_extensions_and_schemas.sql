-- =============================================================================
-- 0001 · Extensions, schemas, and shared conventions
-- -----------------------------------------------------------------------------
-- UNZA Data Analytics Platform — layered warehouse inside a single Postgres DB.
--
--   raw   → land every source verbatim (JSONB) with provenance
--   core  → conformed, entity-resolved canonical model (the "truth")
--   mart  → star schemas / materialized views for dashboards
--   ops   → ETL bookkeeping (watermarks, run log)
--
-- Supabase ships Postgres 15+. These extensions are all available on Supabase
-- Cloud; enabling them here keeps local (supabase start) and remote in sync.
-- =============================================================================

create extension if not exists "pgcrypto"  with schema extensions;  -- gen_random_uuid()
create extension if not exists "pg_trgm"    with schema extensions;  -- fuzzy name matching
create extension if not exists "unaccent"   with schema extensions;  -- diacritic-insensitive match
-- pg_cron lives in its own `cron` schema and targets the `postgres` database.
create extension if not exists "pg_cron";

-- -----------------------------------------------------------------------------
-- Schemas (namespaces). Keeping layers separate is what keeps this maintainable:
-- dashboards only ever touch `mart`; analysts never see `raw`.
-- -----------------------------------------------------------------------------
create schema if not exists raw;
create schema if not exists core;
create schema if not exists mart;
create schema if not exists ops;

comment on schema raw  is 'Landing layer: source payloads verbatim as JSONB. Never transformed. Full replay source of truth.';
comment on schema core is 'Integration layer: deduplicated, entity-resolved canonical entities. SCD Type-2 where history matters.';
comment on schema mart is 'Presentation layer: star schemas and materialized views tuned for BI. The only layer dashboards query.';
comment on schema ops  is 'ETL bookkeeping: load watermarks and run audit log.';

-- -----------------------------------------------------------------------------
-- Shared trigger: keep updated_at honest on core tables.
-- -----------------------------------------------------------------------------
create or replace function core.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- -----------------------------------------------------------------------------
-- Canonical identifier schemes used across the person / publication crosswalks.
-- Enumerated as a table (not an enum type) so new sources need no DDL migration.
-- -----------------------------------------------------------------------------
create table core.identifier_scheme (
  scheme       text primary key,
  description  text not null,
  applies_to   text not null check (applies_to in ('person','publication','venue','institution'))
);

insert into core.identifier_scheme (scheme, description, applies_to) values
  ('orcid',          'ORCID iD',                         'person'),
  ('openalex_author','OpenAlex Author ID',               'person'),
  ('scholar',        'Google Scholar profile/cluster ID','person'),
  ('scopus_author',  'Scopus Author ID',                 'person'),
  ('sis',            'UNZA SIS student/staff number',    'person'),
  ('moodle',         'Moodle user ID',                   'person'),
  ('email',          'Institutional email address',      'person'),
  ('doi',            'Digital Object Identifier',        'publication'),
  ('openalex_work',  'OpenAlex Work ID',                 'publication'),
  ('dspace_handle',  'DSpace repository handle',         'publication'),
  ('ojs',            'journals.unza.zm (OJS) article ID','publication'),
  ('scholar_cluster','Google Scholar cluster ID',        'publication'),
  ('issn',           'ISSN',                             'venue'),
  ('openalex_source','OpenAlex Source ID',               'venue'),
  ('ror',            'Research Organization Registry ID', 'institution');
