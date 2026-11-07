-- =============================================================================
-- 0009 · Research analytics — capture OA status + research fields, and expose
-- segmented bibliometric views (venues, fields, authors, OA, types, impact).
-- All research views are scoped to REAL OpenAlex works (seed rows excluded) and
-- are publication-grain / public (research output is not student PII).
-- =============================================================================

alter table core.publication
  add column if not exists oa_status      text,  -- gold/green/hybrid/bronze/closed/diamond
  add column if not exists topic          text,  -- OpenAlex primary_topic
  add column if not exists topic_subfield text,
  add column if not exists topic_field    text;  -- the broad discipline (e.g. "Medicine")

-- Reusable predicate: a publication that came from OpenAlex (vs synthetic seed).
-- Expressed inline in each view via EXISTS on the crosswalk.

-- ── institution-level headline bibliometrics ───────────────────────────
create or replace view api.research_summary as
with real as (
  select p.* from core.publication p
  where exists (select 1 from core.publication_identifier pi
                where pi.publication_id = p.publication_id and pi.scheme = 'openalex_work')
),
hindex as (
  select coalesce(max(rn), 0) as h
  from (select cited_by_count, row_number() over (order by cited_by_count desc) as rn from real) q
  where cited_by_count >= rn
)
select
  (select count(*) from real)                                        as works,
  (select coalesce(sum(cited_by_count), 0) from real)                as citations,
  (select round(avg(cited_by_count), 1) from real)                   as mean_citations,
  (select round(avg((is_open_access)::int)::numeric, 3) from real)   as pct_open_access,
  (select h from hindex)                                             as h_index,
  (select count(distinct a.person_id) from core.authorship a
     where exists (select 1 from real r where r.publication_id = a.publication_id)) as authors,
  (select count(distinct venue_id) from real where venue_id is not null) as venues;

-- ── output & citations by year ─────────────────────────────────────────
create or replace view api.research_trend as
select p.pub_year as year, count(*) as works, coalesce(sum(p.cited_by_count), 0) as citations
from core.publication p
where p.pub_year is not null
  and exists (select 1 from core.publication_identifier pi
              where pi.publication_id = p.publication_id and pi.scheme = 'openalex_work')
group by p.pub_year
order by p.pub_year;

-- ── top venues / journals (the "publication avenues") ──────────────────
create or replace view api.top_venue as
select v.name as venue, v.is_unza_journal,
       count(*) as works,
       coalesce(sum(p.cited_by_count), 0) as citations,
       round(avg((p.is_open_access)::int)::numeric, 2) as oa_share
from core.publication p
join core.venue v on v.venue_id = p.venue_id
where exists (select 1 from core.publication_identifier pi
              where pi.publication_id = p.publication_id and pi.scheme = 'openalex_work')
group by v.venue_id, v.name, v.is_unza_journal
order by works desc, citations desc;

-- ── dominating research fields ─────────────────────────────────────────
create or replace view api.top_field as
select coalesce(p.topic_field, 'Unclassified') as field,
       count(*) as works,
       coalesce(sum(p.cited_by_count), 0) as citations
from core.publication p
where exists (select 1 from core.publication_identifier pi
              where pi.publication_id = p.publication_id and pi.scheme = 'openalex_work')
group by coalesce(p.topic_field, 'Unclassified')
order by works desc;

-- ── most visible / productive researchers ──────────────────────────────
create or replace view api.top_author as
select pe.person_id, pe.display_name as author,
       count(*) as works,
       coalesce(sum(p.cited_by_count), 0) as citations
from core.authorship a
join core.publication p on p.publication_id = a.publication_id
join core.person pe on pe.person_id = a.person_id
where exists (select 1 from core.publication_identifier pi
              where pi.publication_id = p.publication_id and pi.scheme = 'openalex_work')
group by pe.person_id, pe.display_name
order by citations desc, works desc;

-- ── open-access visibility mix ─────────────────────────────────────────
create or replace view api.oa_breakdown as
select coalesce(p.oa_status, 'unknown') as status,
       count(*) as works,
       coalesce(sum(p.cited_by_count), 0) as citations
from core.publication p
where exists (select 1 from core.publication_identifier pi
              where pi.publication_id = p.publication_id and pi.scheme = 'openalex_work')
group by coalesce(p.oa_status, 'unknown')
order by works desc;

-- ── output by type ─────────────────────────────────────────────────────
create or replace view api.pub_type as
select coalesce(p.type, 'other') as type, count(*) as works
from core.publication p
where exists (select 1 from core.publication_identifier pi
              where pi.publication_id = p.publication_id and pi.scheme = 'openalex_work')
group by coalesce(p.type, 'other')
order by works desc;

grant select on
  api.research_summary, api.research_trend, api.top_venue, api.top_field,
  api.top_author, api.oa_breakdown, api.pub_type
to authenticated;
