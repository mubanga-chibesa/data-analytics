"""ETL entrypoint: pull from a source into raw.ingest, advancing watermarks.

Usage:
    python -m etl.run openalex            # run one connector
    python -m etl.run all                 # run every registered connector
    python -m etl.run openalex --full     # ignore watermark, full reload

After landing, run dbt to build core + mart:
    dbt build        (from ./dbt)
Marts are also refreshed nightly by pg_cron (see migration 0006).
"""
from __future__ import annotations

import argparse
import sys
import traceback

from common import db
from common.base import Connector
from connectors.openalex import OpenAlexWorks
from connectors.stubs import (
    DSpaceItems,
    MoodleActivity,
    OjsArticles,
    OrcidWorks,
    SisExtract,
)

REGISTRY: dict[str, Connector] = {
    c.source: c
    for c in [
        OpenAlexWorks(),
        OrcidWorks(),
        DSpaceItems(),
        OjsArticles(),
        MoodleActivity(),
        SisExtract(),
    ]
}


def run_connector(name: str, full: bool) -> None:
    connector = REGISTRY[name]
    with db.connect() as conn:
        run_id = db.start_run(conn, connector.source, connector.entity_type)
        rows_read = rows_loaded = 0
        last_seen = None
        try:
            since = None if full else db.get_watermark(conn, connector.source, connector.entity_type)
            batch: list[tuple[str, dict]] = []
            for source_key, payload in connector.fetch(since):
                rows_read += 1
                last_seen = payload.get("updated_date") or payload.get("last_modified") or last_seen
                batch.append((source_key, payload))
                if len(batch) >= 500:
                    rows_loaded += db.land_records(conn, run_id, connector.source, connector.entity_type, batch)
                    batch.clear()
            if batch:
                rows_loaded += db.land_records(conn, run_id, connector.source, connector.entity_type, batch)

            wm = connector.new_watermark(last_seen)
            if wm:
                db.set_watermark(conn, connector.source, connector.entity_type, wm, rows_loaded)
                conn.commit()
            db.finish_run(conn, run_id, "succeeded", rows_read, rows_loaded)
            print(f"[{name}] read={rows_read} loaded={rows_loaded} watermark={wm}")
        except NotImplementedError as e:
            db.finish_run(conn, run_id, "failed", rows_read, rows_loaded, str(e))
            print(f"[{name}] not implemented yet: {e}", file=sys.stderr)
        except Exception as e:  # noqa: BLE001
            db.finish_run(conn, run_id, "failed", rows_read, rows_loaded, traceback.format_exc())
            print(f"[{name}] FAILED: {e}", file=sys.stderr)
            raise


def main() -> None:
    ap = argparse.ArgumentParser(description="UNZA analytics ETL loader")
    ap.add_argument("source", choices=[*REGISTRY.keys(), "all"])
    ap.add_argument("--full", action="store_true", help="ignore watermark, full reload")
    args = ap.parse_args()

    names = list(REGISTRY) if args.source == "all" else [args.source]
    for name in names:
        run_connector(name, args.full)


if __name__ == "__main__":
    main()
