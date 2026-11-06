# UNZA Data Analytics Platform

Research & academic analytics for the University of Zambia — one platform that
unifies teaching/learning data (Moodle, SIS) with research output (ORCID,
OpenAlex, Google Scholar, DSpace, journals.unza.zm) into institutional dashboards.

## Architecture

A single PostgreSQL database (Supabase) organised into layers, fed by batch ETL,
transformed with dbt, served to a Next.js dashboard through row-scoped API views.

```
  Sources                ETL (Python)        PostgreSQL (Supabase)                 App
 ┌──────────┐           ┌───────────┐   ┌───────────────────────────────┐   ┌────────────┐
 │ OpenAlex │           │ connectors│   │ raw   → land verbatim (JSONB) │   │ Next.js 16 │
 │ ORCID    │──pull──▶  │ + loader  │──▶│ core  → conformed, resolved   │──▶│ shadcn-ish │
 │ DSpace   │  (batch)  │ watermarks│   │ mart  → star schemas (matviews)│   │ Recharts   │
 │ OJS      │           └───────────┘   │ api   → RLS-scoped views       │   │ Supabase   │
 │ Moodle   │                ▲          └───────────────────────────────┘   │ Auth + RLS │
 │ SIS      │            dbt (raw→core→mart transforms)                      └────────────┘
 └──────────┘            pg_cron (nightly refresh + partition maintenance)
```

Key design decisions (and why):
- **Layered schemas** (`raw`/`core`/`mart`): dashboards only touch `mart`; analysts never see `raw`.
- **Entity resolution** via `core.person` + `core.person_identifier` crosswalk — the same researcher/student across six sources resolves to one id.
- **SCD Type-2** on student status, affiliations, departments — makes year-over-year institutional reports correct.
- **Partitioned `core.lms_activity`** (monthly) — the high-volume Moodle log stays fast.
- **RLS + `api` views** — student PII is scoped by role/department in the database, not the app.
- **Batch + pg_cron** — nightly ETL then `mart.refresh_all()`; no external scheduler needed to start.

## Repo layout

```
supabase/migrations/   7 migrations: schemas, raw, core, mart, RLS, cron, api.me
supabase/seed.sql      synthetic demo data (students, courses, LMS, publications)
etl/                   Python loader: base connector, OpenAlex (worked), source stubs
dbt/                   transformation layer (staging views over raw JSONB)
web/                   Next.js 16 dashboard (App Router, Tailwind v4, Recharts)
```

## Getting started

### 1. Database (already provisioned on Supabase Cloud)
```bash
cp .env.example .env   # fill in your project values
supabase db push --db-url "$DATABASE_URL"       # apply migrations
psql "$DATABASE_URL" -f supabase/seed.sql        # optional demo data
```
The `api` schema is exposed to PostgREST via:
`alter role authenticator set pgrst.db_schemas = 'public, graphql_public, api';`

### 2. Web app
```bash
cd web
cp ../.env.example .env.local   # needs NEXT_PUBLIC_SUPABASE_URL + _PUBLISHABLE_KEY
npm install
npm run dev                     # http://localhost:3000
```

**Demo login** (seeded as `institutional_analyst`, sees all departments):
`analyst@unza.zm` / `UnzaDemo#2026`

### 3. ETL
```bash
cd etl && pip install -r requirements.txt
python -m etl.run openalex      # pulls UNZA works from OpenAlex into raw.ingest
python -m etl.run all           # all connectors (stubs raise NotImplementedError)
```

### 4. dbt (transforms)
```bash
cd dbt && cp profiles.yml.example ~/.dbt/profiles.yml
dbt build                        # builds staging views over raw
```

## Roles & access

| Role | Sees |
|---|---|
| `super_admin` | everything + manages user profiles |
| `institutional_analyst` | all departments (no PII restriction) |
| `faculty_admin` | only their `department_ids` |
| `viewer` | de-identified aggregates only |

New sign-ups default to `viewer`; promote via `app.user_profile`.

## Status

- ✅ Schema, RLS, marts, cron, seed — deployed & verified on Supabase Cloud
- ✅ Dashboard — Overview / Students / Research, building green
- ✅ OpenAlex connector — worked reference
- 🚧 ORCID / DSpace / OJS / Moodle / SIS connectors — stubbed with implementation notes
- 🚧 dbt core/mart models — staging started; raw→core population to extend
