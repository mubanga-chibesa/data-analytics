"""Base connector contract. Every source implements `fetch`."""
from __future__ import annotations

from abc import ABC, abstractmethod
from typing import Any, Iterator


class Connector(ABC):
    #: stable source key, e.g. 'openalex'
    source: str
    #: entity landed by this connector, e.g. 'work'
    entity_type: str

    @abstractmethod
    def fetch(self, since: str | None) -> Iterator[tuple[str, dict[str, Any]]]:
        """Yield (source_key, payload) pairs newer than `since` (a watermark).

        `since` is the last watermark value this connector stored (opaque string,
        typically an ISO timestamp or cursor). Implementations should pull only
        changed records and yield them oldest-first so the watermark advances
        monotonically.
        """
        raise NotImplementedError

    def new_watermark(self, last_seen: str | None) -> str | None:
        """Watermark to persist after a successful run. Default: last record seen."""
        return last_seen
