-- =============================================================================
-- Server-side OpenAlex raw → core transform.
-- Same logic as transform_openalex.py but runs entirely inside Postgres, so it
-- has no per-row network latency. Idempotent: dedups via the identifier
-- crosswalks (openalex_work / openalex_author) and ON CONFLICT guards.
-- Run:  psql "$DATABASE_URL" -f etl/transform_openalex.sql
-- =============================================================================
set statement_timeout = 0;

do $$
declare
  w          record;
  a          jsonb;
  author     jsonb;
  v_pub_id   bigint;
  v_venue_id bigint;
  v_person_id bigint;
  v_oa       text;
  v_name     text;
  v_src      jsonb;
begin
  for w in
    select distinct on (source_key) source_key as oa, payload as p
    from raw.ingest
    where source = 'openalex' and entity_type = 'work'
    order by source_key, ingested_at desc
  loop
    -- ── venue ──────────────────────────────────────────────────────────
    v_venue_id := null;
    v_src := w.p->'primary_location'->'source';
    if v_src->>'display_name' is not null then
      select venue_id into v_venue_id
        from core.venue where lower(name) = lower(v_src->>'display_name') limit 1;
      if v_venue_id is null then
        insert into core.venue (name, issn, publisher, is_unza_journal)
        values (v_src->>'display_name', v_src->>'issn_l', v_src->>'host_organization_name',
                lower(v_src->>'display_name') like '%zambia%')
        returning venue_id into v_venue_id;
      end if;
    end if;

    -- ── publication (dedup on openalex_work identifier) ────────────────
    select publication_id into v_pub_id
      from core.publication_identifier where scheme = 'openalex_work' and value = w.oa;

    if v_pub_id is null then
      insert into core.publication
        (title, type, pub_date, pub_year, venue_id, is_open_access, cited_by_count,
         oa_status, topic, topic_subfield, topic_field)
      values (
        coalesce(w.p->>'display_name', '(untitled)'),
        w.p->>'type',
        nullif(w.p->>'publication_date','')::date,
        nullif(w.p->>'publication_year','')::int,
        v_venue_id,
        (w.p->'open_access'->>'is_oa')::boolean,
        coalesce((w.p->>'cited_by_count')::int, 0),
        w.p->'open_access'->>'oa_status',
        w.p->'primary_topic'->>'display_name',
        w.p->'primary_topic'->'subfield'->>'display_name',
        w.p->'primary_topic'->'field'->>'display_name'
      )
      returning publication_id into v_pub_id;

      insert into core.publication_identifier (publication_id, scheme, value, source)
        values (v_pub_id, 'openalex_work', w.oa, 'openalex') on conflict do nothing;
      if w.p->>'doi' is not null then
        insert into core.publication_identifier (publication_id, scheme, value, source)
          values (v_pub_id, 'doi', lower(replace(w.p->>'doi','https://doi.org/','')), 'openalex')
          on conflict do nothing;
      end if;
    else
      update core.publication
         set cited_by_count = coalesce((w.p->>'cited_by_count')::int, 0),
             is_open_access = (w.p->'open_access'->>'is_oa')::boolean,
             venue_id       = coalesce(venue_id, v_venue_id),
             oa_status      = w.p->'open_access'->>'oa_status',
             topic          = w.p->'primary_topic'->>'display_name',
             topic_subfield = w.p->'primary_topic'->'subfield'->>'display_name',
             topic_field    = w.p->'primary_topic'->'field'->>'display_name',
             updated_at     = now()
       where publication_id = v_pub_id;
    end if;

    -- ── authorships ────────────────────────────────────────────────────
    for a in select * from jsonb_array_elements(coalesce(w.p->'authorships', '[]'::jsonb))
    loop
      author := a->'author';
      v_name := author->>'display_name';
      continue when v_name is null;

      v_oa := substring(author->>'id' from '[^/]+$');
      v_person_id := null;
      if v_oa is not null then
        select person_id into v_person_id
          from core.person_identifier where scheme = 'openalex_author' and value = v_oa;
      end if;

      if v_person_id is null then
        insert into core.person (full_name, display_name, kind)
          values (v_name, v_name, '{researcher}') returning person_id into v_person_id;
        if v_oa is not null then
          insert into core.person_identifier (person_id, scheme, value, source)
            values (v_person_id, 'openalex_author', v_oa, 'openalex') on conflict do nothing;
        end if;
        if author->>'orcid' is not null then
          insert into core.person_identifier (person_id, scheme, value, source)
            values (v_person_id, 'orcid', substring(author->>'orcid' from '[^/]+$'), 'openalex')
            on conflict do nothing;
        end if;
      end if;

      insert into core.authorship
        (publication_id, person_id, author_position, is_corresponding, raw_author_name)
      values (
        v_pub_id, v_person_id,
        case a->>'author_position' when 'first' then 1 when 'last' then 99 else 50 end,
        coalesce((a->>'is_corresponding')::boolean, false),
        v_name
      )
      on conflict do nothing;
    end loop;
  end loop;
end $$;

-- ── internal citation edges (UNZA work → UNZA work we hold) ─────────────
insert into core.citation (citing_publication_id, cited_publication_id, source)
select distinct ci.publication_id, cj.publication_id, 'openalex'
from (
  select distinct on (source_key) source_key as oa, payload as p
  from raw.ingest where source = 'openalex' and entity_type = 'work'
  order by source_key, ingested_at desc
) w
cross join lateral jsonb_array_elements_text(coalesce(w.p->'referenced_works','[]'::jsonb)) as ref(url)
join core.publication_identifier ci on ci.scheme = 'openalex_work' and ci.value = w.oa
join core.publication_identifier cj on cj.scheme = 'openalex_work'
  and cj.value = substring(ref.url from '[^/]+$')
where ci.publication_id <> cj.publication_id
on conflict do nothing;
