-- =============================================================================
-- 0010 · Drill-down support — filterable, linkable publication views so the UI
-- can expand any segment (field / venue / researcher) into its underlying works,
-- each linking out to the source (DOI / OpenAlex).
-- =============================================================================

-- api.publication gains the dimensions you filter by (topic_field, oa_status)
-- and the identifiers you link out with (doi, openalex_id).
drop view if exists api.publication;
create view api.publication
  with (security_barrier = true) as
  select
    p.publication_id,
    p.title,
    p.type,
    p.pub_year,
    p.cited_by_count,
    p.is_open_access,
    p.oa_status,
    p.topic,
    p.topic_field,
    v.name  as venue_name,
    v.is_unza_journal,
    (select count(*) from core.authorship a where a.publication_id = p.publication_id) as author_count,
    (select value from core.publication_identifier pi
       where pi.publication_id = p.publication_id and pi.scheme = 'doi' limit 1)           as doi,
    (select value from core.publication_identifier pi
       where pi.publication_id = p.publication_id and pi.scheme = 'openalex_work' limit 1)  as openalex_id
  from core.publication p
  left join core.venue v on v.venue_id = p.venue_id;

-- Publications for a given researcher (drill by person_id).
create or replace view api.author_publication
  with (security_barrier = true) as
  select
    a.person_id,
    p.publication_id,
    p.title,
    p.pub_year,
    p.cited_by_count,
    p.is_open_access,
    p.topic_field,
    v.name as venue_name,
    (select value from core.publication_identifier pi
       where pi.publication_id = p.publication_id and pi.scheme = 'doi' limit 1)          as doi,
    (select value from core.publication_identifier pi
       where pi.publication_id = p.publication_id and pi.scheme = 'openalex_work' limit 1) as openalex_id
  from core.authorship a
  join core.publication p on p.publication_id = a.publication_id
  left join core.venue v on v.venue_id = p.venue_id;

grant select on api.publication, api.author_publication to authenticated;
