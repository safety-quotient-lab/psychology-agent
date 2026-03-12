// Package db — schema documentation.
//
// The dual-DB schema resides in two embedded SQL files:
//   - schema_shared.sql → state.db (project knowledge, exportable)
//   - schema_local.sql  → state.local.db (machine-local, never shared)
//
// The canonical single-file schema remains at scripts/schema.sql for human
// reference and backward compatibility. The split files represent the
// authoritative table assignment for agentdb.
//
// Table reassignment from the original single-DB schema:
//   SHARED (state.db): transport_messages, decision_chain, trigger_state,
//     session_log, claims, epistemic_flags, psq_status, universal_facets,
//     facet_vocabulary, github_issues, lessons*, engineering_incidents*,
//     schema_version, table_visibility
//   LOCAL (state.local.db): autonomy_budget, autonomous_actions,
//     active_gates, memory_entries, entry_facets
//
// * = REASSIGNED from private to shared (transferable patterns / anti-pattern catalog)
package db
