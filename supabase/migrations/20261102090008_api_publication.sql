-- =============================================================================
-- 0008 · api.publication — one row per publication (not per author).
-- fact_publication is grained per (publication_id, person_id) for department
-- attribution, which double-counts multi-author papers in a publication list.
-- This view is publication-grain for the Research page's "most-cited" table.
-- Research output is public, so it isn't department-scoped.
-- =============================================================================
create view api.publication
  with (security_barrier = true) as
  select
    p.publication_id,
    p.title,
    p.type,
    p.pub_year,
    p.cited_by_count,
    p.is_open_access,
    v.name  as venue_name,
    v.is_unza_journal,
    (select count(*) from core.authorship a where a.publication_id = p.publication_id) as author_count
  from core.publication p
  left join core.venue v on v.venue_id = p.venue_id;

grant select on api.publication to authenticated;
