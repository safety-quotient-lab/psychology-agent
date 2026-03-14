"""
state — Domain-driven state layer for psychology-agent.

Bounded contexts:
    transport    Messages, turns, manifest, cross-repo fetch
    gates        Gated autonomous chains
    knowledge    Memory entries, session log, design decisions
    cogarch      Trigger telemetry, lessons
    quality      Claims, epistemic flags, incidents, facets
    predictions  Efference copy: outbound prediction and inbound comparison

Infrastructure:
    connection  DB connection, project paths, schema bootstrap
"""

from .connection import get_connection, PROJECT_ROOT, DB_PATH, SCHEMA_PATH

__all__ = ["get_connection", "PROJECT_ROOT", "DB_PATH", "SCHEMA_PATH"]
