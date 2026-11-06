-- Flatten OpenAlex Work payloads from raw.ingest into typed columns.
-- Takes the latest landed version of each work (by ingested_at).
with ranked as (
  select
    source_key,
    payload,
    row_number() over (partition by source_key order by ingested_at desc) as rn
  from {{ source('raw', 'ingest') }}
  where source = 'openalex' and entity_type = 'work'
)
select
  source_key                                            as openalex_id,
  payload ->> 'doi'                                     as doi,
  payload ->> 'title'                                   as title,
  payload ->> 'type'                                    as type,
  (payload ->> 'publication_year')::int                as pub_year,
  (payload ->> 'publication_date')::date               as pub_date,
  (payload -> 'open_access' ->> 'is_oa')::boolean       as is_open_access,
  (payload ->> 'cited_by_count')::int                   as cited_by_count,
  payload -> 'primary_location' -> 'source' ->> 'display_name' as venue_name,
  payload -> 'primary_location' -> 'source' ->> 'issn_l'       as issn,
  payload -> 'authorships'                              as authorships,
  payload -> 'abstract_inverted_index'                 as abstract_index
from ranked
where rn = 1
