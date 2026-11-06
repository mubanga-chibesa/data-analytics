"""Transform landed OpenAlex works (raw.ingest) into the core canonical model.

Idempotent: re-running updates existing rows and inserts new ones, keyed on the
identifier crosswalks (openalex_work / openalex_author). Populates:
  core.venue, core.publication (+ publication_identifier),
  core.person (+ person_identifier), core.authorship, core.citation.

Run after `python run.py openalex`, then refresh marts:
    python transform_openalex.py
    psql "$DATABASE_URL" -c "select mart.refresh_all(false);"
"""
from __future__ import annotations

import os

import psycopg
from dotenv import load_dotenv

load_dotenv()
DATABASE_URL = os.environ["DATABASE_URL"]


def oa_suffix(url: str | None) -> str | None:
    return url.rsplit("/", 1)[-1] if url else None


def norm_doi(doi: str | None) -> str | None:
    # OpenAlex gives a full URL; store the bare DOI.
    if not doi:
        return None
    return doi.replace("https://doi.org/", "").lower()


def reconstruct_abstract(inv: dict | None) -> str | None:
    if not inv:
        return None
    positions: list[tuple[int, str]] = []
    for word, idxs in inv.items():
        for i in idxs:
            positions.append((i, word))
    if not positions:
        return None
    positions.sort()
    text = " ".join(w for _, w in positions)
    return text[:4000]  # keep it sane


def main() -> None:
    with psycopg.connect(DATABASE_URL) as conn:
        # Apply session settings via autocommit so no open transaction lingers.
        # idle_in_transaction_session_timeout lets Postgres reclaim the session
        # (and its locks) if this process dies mid-run, instead of hanging; set
        # it well above the longest gap between statements. statement_timeout is
        # lifted from the aggressive default for this bulk job.
        conn.autocommit = True
        with conn.cursor() as c0:
            c0.execute("set statement_timeout = '180s'")
            c0.execute("set idle_in_transaction_session_timeout = '300s'")
        conn.autocommit = False
        cur = conn.cursor()

        # Pull the latest landed version of each OpenAlex work.
        works = cur.execute(
            """
            select distinct on (source_key) source_key, payload
            from raw.ingest
            where source = 'openalex' and entity_type = 'work'
            order by source_key, ingested_at desc
            """
        ).fetchall()
        print(f"transforming {len(works)} works")

        # ── caches to avoid per-row lookups ──────────────────────────────
        pub_by_oa: dict[str, int] = dict(
            cur.execute(
                "select value, publication_id from core.publication_identifier where scheme='openalex_work'"
            ).fetchall()
        )
        person_by_oa: dict[str, int] = dict(
            cur.execute(
                "select value, person_id from core.person_identifier where scheme='openalex_author'"
            ).fetchall()
        )
        venue_by_name: dict[str, int] = {
            (name or "").lower(): vid
            for vid, name in cur.execute("select venue_id, name from core.venue").fetchall()
        }

        def get_venue(src: dict | None) -> int | None:
            if not src or not src.get("display_name"):
                return None
            name = src["display_name"]
            key = name.lower()
            if key in venue_by_name:
                return venue_by_name[key]
            vid = cur.execute(
                """insert into core.venue (name, issn, publisher, is_unza_journal)
                   values (%s, %s, %s, %s) returning venue_id""",
                (name, src.get("issn_l"), src.get("host_organization_name"),
                 "zambia" in name.lower()),
            ).fetchone()[0]
            venue_by_name[key] = vid
            return vid

        def get_person(author: dict) -> int | None:
            oa = oa_suffix(author.get("id"))
            name = author.get("display_name")
            if not name:
                return None
            if oa and oa in person_by_oa:
                return person_by_oa[oa]
            pid = cur.execute(
                """insert into core.person (full_name, display_name, kind)
                   values (%s, %s, '{researcher}') returning person_id""",
                (name, name),
            ).fetchone()[0]
            if oa:
                cur.execute(
                    """insert into core.person_identifier (person_id, scheme, value, source)
                       values (%s, 'openalex_author', %s, 'openalex')
                       on conflict do nothing""",
                    (pid, oa),
                )
                person_by_oa[oa] = pid
            if author.get("orcid"):
                cur.execute(
                    """insert into core.person_identifier (person_id, scheme, value, source)
                       values (%s, 'orcid', %s, 'openalex') on conflict do nothing""",
                    (pid, oa_suffix(author["orcid"])),
                )
            return pid

        referenced: dict[str, list[str]] = {}
        pubs_new = authors_new = 0

        for n, (oa_id, w) in enumerate(works, 1):
            # Commit periodically so we never hold one giant transaction through
            # the session pooler (which drops long/idle transactions).
            if n % 150 == 0:
                conn.commit()
                print(f"  …{n}/{len(works)} works")
            venue_id = get_venue((w.get("primary_location") or {}).get("source"))
            title = w.get("display_name") or w.get("title") or "(untitled)"
            pub_year = w.get("publication_year")
            oa_info = w.get("open_access") or {}

            if oa_id in pub_by_oa:
                pub_id = pub_by_oa[oa_id]
                cur.execute(
                    """update core.publication
                          set cited_by_count=%s, is_open_access=%s, venue_id=coalesce(venue_id,%s),
                              updated_at=now()
                        where publication_id=%s""",
                    (w.get("cited_by_count", 0), oa_info.get("is_oa"), venue_id, pub_id),
                )
            else:
                pub_id = cur.execute(
                    """insert into core.publication
                         (title, type, pub_date, pub_year, venue_id, is_open_access,
                          cited_by_count, abstract)
                       values (%s,%s,%s,%s,%s,%s,%s,%s) returning publication_id""",
                    (
                        title, w.get("type"), w.get("publication_date"), pub_year,
                        venue_id, oa_info.get("is_oa"), w.get("cited_by_count", 0),
                        reconstruct_abstract(w.get("abstract_inverted_index")),
                    ),
                ).fetchone()[0]
                pub_by_oa[oa_id] = pub_id
                pubs_new += 1
                cur.execute(
                    """insert into core.publication_identifier (publication_id, scheme, value, source)
                       values (%s,'openalex_work',%s,'openalex') on conflict do nothing""",
                    (pub_id, oa_id),
                )
                doi = norm_doi(w.get("doi"))
                if doi:
                    cur.execute(
                        """insert into core.publication_identifier (publication_id, scheme, value, source)
                           values (%s,'doi',%s,'openalex') on conflict do nothing""",
                        (pub_id, doi),
                    )

            # authorships
            seen_people: set[int] = set()
            for a in w.get("authorships", []):
                person_id = get_person(a.get("author") or {})
                if not person_id or person_id in seen_people:
                    continue
                seen_people.add(person_id)
                pos = {"first": 1, "last": 99}.get(a.get("author_position"), 50)
                before = cur.rowcount
                cur.execute(
                    """insert into core.authorship
                         (publication_id, person_id, author_position, is_corresponding, raw_author_name)
                       values (%s,%s,%s,%s,%s) on conflict do nothing""",
                    (pub_id, person_id, pos, a.get("is_corresponding", False),
                     (a.get("author") or {}).get("display_name")),
                )
                if cur.rowcount and before == 0:
                    authors_new += 1

            refs = [oa_suffix(r) for r in (w.get("referenced_works") or [])]
            if refs:
                referenced[oa_id] = refs

        conn.commit()

        # ── citation edges among works we actually hold ──────────────────
        # Build the full edge list in Python, then insert in batches.
        edges: list[tuple[int, int]] = []
        for citing_oa, refs in referenced.items():
            citing_id = pub_by_oa.get(citing_oa)
            if not citing_id:
                continue
            for ref_oa in refs:
                cited_id = pub_by_oa.get(ref_oa)
                if cited_id and cited_id != citing_id:
                    edges.append((citing_id, cited_id))

        cites = 0
        for i in range(0, len(edges), 1000):
            chunk = edges[i : i + 1000]
            cur.executemany(
                """insert into core.citation (citing_publication_id, cited_publication_id, source)
                   values (%s,%s,'openalex') on conflict do nothing""",
                chunk,
            )
            conn.commit()
            cites += len(chunk)
        print(f"done: +{pubs_new} new publications, +{authors_new} new authorships, "
              f"{cites} internal citation edges, {len(venue_by_name)} venues total")


if __name__ == "__main__":
    main()
