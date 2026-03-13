# Shared Frontend Assets

Reusable CSS, Web Components, and utilities for mesh agent dashboards.

## Files

| File | Purpose | Lines |
|------|---------|-------|
| `lcars-theme.css` | LCARS design system — variables, themes (dark/light/LCARS), frame layout, panel/table primitives | 345 |
| `mesh-components.js` | Web Components — MeshDataTable, MeshTopology, AgentHealthCard, OpsBudgetCard | 460 |
| `mesh-utils.js` | Utility functions — parseTS, formatTS, escapeHtml, transportGitHubUrl | 40 |

## Usage

Agent dashboards can include these assets directly in their HTML:

```html
<style>
  /* Include lcars-theme.css content here, or @import from a served URL */
</style>
<script>
  /* Include mesh-utils.js, then mesh-components.js */
</script>
```

Or, when meshd serves shared assets:

```html
<link rel="stylesheet" href="/shared/lcars-theme.css">
<script src="/shared/mesh-utils.js"></script>
<script src="/shared/mesh-components.js"></script>
```

## Components

### `<mesh-data-table>`

Generic sortable, filterable, paginated table. Light DOM — inherits
parent CSS.

```js
const table = document.getElementById('my-table');
table.columns = [
  { key: 'name', label: 'Name', sortable: true },
  { key: 'value', label: 'Value', render: (v, row) => `<b>${v}</b>` },
];
table.rows = myDataArray;
```

### `<mesh-topology>`

SVG pentagon topology graph showing mesh agent connections.

```js
const topo = document.getElementById('my-topology');
topo.agents = AGENTS;       // Array of { id, color }
topo.agentStates = states;  // { agentId: { status: "online"|"unreachable" } }
```

### `<agent-health-card>`

Agent status card showing online/offline state, budget, metrics.

### `<ops-budget-card>`

Budget visualization card for Operations-specific dashboards.
