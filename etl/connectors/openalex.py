"""OpenAlex connector — reference implementation.

OpenAlex is a free, key-less scholarly API. We pull Works affiliated with the
University of Zambia (ROR 03zj4c476) using cursor pagination and incremental
`from_updated_date` filtering driven by the watermark.

Docs: https://docs.openalex.org/
"""
from __future__ import annotations

import os
from typing import Any, Iterator

import httpx
from tenacity import retry, stop_after_attempt, wait_exponential

from common.base import Connector

UNZA_ROR = "https://ror.org/03zj4c476"
BASE = "https://api.openalex.org/works"
# OpenAlex asks for a mailto for the "polite pool" (faster, more reliable).
MAILTO = os.getenv("OPENALEX_MAILTO", "analytics@unza.zm")


class OpenAlexWorks(Connector):
    source = "openalex"
    entity_type = "work"

    @retry(stop=stop_after_attempt(4), wait=wait_exponential(min=1, max=20))
    def _page(self, client: httpx.Client, params: dict[str, Any]) -> dict[str, Any]:
        r = client.get(BASE, params=params, timeout=60)
        r.raise_for_status()
        return r.json()

    def fetch(self, since: str | None) -> Iterator[tuple[str, dict[str, Any]]]:
        filters = [f"institutions.ror:{UNZA_ROR}"]
        if since:
            # Watermark is an ISO date/time; OpenAlex wants YYYY-MM-DD.
            filters.append(f"from_updated_date:{since[:10]}")

        params = {
            "filter": ",".join(filters),
            "per-page": 200,
            "cursor": "*",
            "mailto": MAILTO,
            "sort": "updated_date:asc",
        }
        with httpx.Client(headers={"User-Agent": f"unza-analytics ({MAILTO})"}) as client:
            while True:
                data = self._page(client, params)
                for work in data.get("results", []):
                    # OpenAlex ids look like https://openalex.org/W1234 — use the suffix.
                    source_key = work["id"].rsplit("/", 1)[-1]
                    yield source_key, work
                cursor = data.get("meta", {}).get("next_cursor")
                if not cursor or not data.get("results"):
                    break
                params["cursor"] = cursor
