"""Connector stubs for the remaining sources.

Each documents how to pull from that source; fill in `fetch` following the
OpenAlex reference in openalex.py. All land into raw.ingest via the same loader,
so transforms (dbt) are the only other place that needs source-specific logic.
"""
from __future__ import annotations

from typing import Any, Iterator

from common.base import Connector


class OrcidWorks(Connector):
    """ORCID public API. For each known ORCID iD (from core.person_identifier),
    GET https://pub.orcid.org/v3.0/{orcid}/works  (Accept: application/json).
    Watermark on last-modified-date per record."""

    source = "orcid"
    entity_type = "work"

    def fetch(self, since: str | None) -> Iterator[tuple[str, dict[str, Any]]]:
        raise NotImplementedError("Implement ORCID pull — see docstring.")


class DSpaceItems(Connector):
    """DSpace institutional repository. Use the REST API
    (/server/api/discover/search/objects) or OAI-PMH endpoint
    (/oai/request?verb=ListRecords&metadataPrefix=oai_dc). Watermark on the
    OAI resumption token or item lastModified."""

    source = "dspace"
    entity_type = "item"

    def fetch(self, since: str | None) -> Iterator[tuple[str, dict[str, Any]]]:
        raise NotImplementedError("Implement DSpace pull — see docstring.")


class OjsArticles(Connector):
    """journals.unza.zm (OJS). OJS REST API: /api/v1/submissions per journal,
    or OAI at /oai. Token auth via an API key issued in the OJS admin."""

    source = "ojs"
    entity_type = "article"

    def fetch(self, since: str | None) -> Iterator[tuple[str, dict[str, Any]]]:
        raise NotImplementedError("Implement OJS pull — see docstring.")


class MoodleActivity(Connector):
    """Moodle Web Services (REST). Enable the external service + token, then call
    core_enrol_get_enrolled_users, mod_*_get_*, and the logstore via a custom
    service or the Moodle DB read-replica for mdl_logstore_standard_log.
    Watermark on timecreated. HIGH VOLUME — pull incrementally by day."""

    source = "moodle"
    entity_type = "activity"

    def fetch(self, since: str | None) -> Iterator[tuple[str, dict[str, Any]]]:
        raise NotImplementedError("Implement Moodle pull — see docstring.")


class SisExtract(Connector):
    """UNZA SIS (sis.unza.zm). Likely a nightly DB extract or CSV drop rather
    than a public API. Point this at the agreed extract location (SFTP / DB
    read-replica) and land students, programmes, enrolments, results.
    Watermark on the extract date or a row updated_at."""

    source = "sis"
    entity_type = "enrollment"

    def fetch(self, since: str | None) -> Iterator[tuple[str, dict[str, Any]]]:
        raise NotImplementedError("Implement SIS extract ingest — see docstring.")
