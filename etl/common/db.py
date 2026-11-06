"""Database access for the ETL loader: raw landing + watermarks + run log."""
from __future__ import annotations

import json
import os
from contextlib import contextmanager
from datetime import datetime, timezone
from typing import Any, Iterable

import psycopg
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.environ["DATABASE_URL"]


@contextmanager
def connect():
    with psycopg.connect(DATABASE_URL, autocommit=False) as conn:
        yield conn


def start_run(conn, source: str, entity_type: str) -> str:
    row = conn.execute(
        """
        insert into ops.etl_run (source, entity_type, status)
        values (%s, %s, 'running') returning run_id
        """,
        (source, entity_type),
    ).fetchone()
    conn.commit()
    return str(row[0])


def finish_run(conn, run_id: str, status: str, rows_read: int, rows_loaded: int, error: str | None = None):
    conn.execute(
        """
        update ops.etl_run
           set status=%s, finished_at=now(), rows_read=%s, rows_loaded=%s, error_detail=%s
         where run_id=%s
        """,
        (status, rows_read, rows_loaded, error, run_id),
    )
    conn.commit()


def get_watermark(conn, source: str, entity_type: str) -> str | None:
    row = conn.execute(
        "select last_value from ops.load_watermark where source=%s and entity_type=%s",
        (source, entity_type),
    ).fetchone()
    return row[0] if row else None


def set_watermark(conn, source: str, entity_type: str, last_value: str, rows_loaded: int):
    conn.execute(
        """
        insert into ops.load_watermark (source, entity_type, last_value, last_run_at, rows_loaded)
        values (%s, %s, %s, now(), %s)
        on conflict (source, entity_type)
        do update set last_value=excluded.last_value,
                      last_run_at=excluded.last_run_at,
                      rows_loaded=excluded.rows_loaded
        """,
        (source, entity_type, last_value, rows_loaded),
    )


def land_records(
    conn,
    run_id: str,
    source: str,
    entity_type: str,
    records: Iterable[tuple[str, dict[str, Any]]],
) -> int:
    """Insert (source_key, payload) pairs into raw.ingest. Returns rows written.

    The content_hash column + this index make re-landing identical payloads a
    cheap no-op at the application level; we skip writes when the latest stored
    payload for a key is unchanged.
    """
    count = 0
    with conn.cursor() as cur:
        for source_key, payload in records:
            cur.execute(
                """
                insert into raw.ingest (run_id, source, entity_type, source_key, payload)
                select %s, %s, %s, %s, %s::jsonb
                where not exists (
                    select 1 from raw.ingest r
                    where r.source=%s and r.entity_type=%s and r.source_key=%s
                      and r.content_hash = encode(extensions.digest(%s, 'sha256'), 'hex')
                )
                """,
                (
                    run_id, source, entity_type, source_key, json.dumps(payload),
                    source, entity_type, source_key, json.dumps(payload),
                ),
            )
            count += cur.rowcount
    conn.commit()
    return count


def utcnow_iso() -> str:
    return datetime.now(timezone.utc).isoformat()
