    // MeshDataTable — generic sortable, filterable, paginated table component.
    // Replaces 11 render functions and the sortTable/filterTable/goToPage dispatchers.
    // Light DOM only — existing CSS selectors keep working.
    class MeshDataTable extends HTMLElement {
        constructor() {
            super();
            this._tableId = '';
            this._columns = [];
            this._rows = [];
            this._agentFilter = 'all';
            this._emptyMessage = 'No data available.';
            this._pageSize = 15;
            this._sortCol = null;
            this._sortDir = -1;
            this._filterText = '';
            this._page = 0;
            this._expandedRows = new Set();
        }

        set tableId(id) { this._tableId = id; }
        get tableId() { return this._tableId; }

        set columns(arr) { this._columns = arr; }
        get columns() { return this._columns; }

        set rows(arr) { this._rows = arr; }
        get rows() { return this._rows; }

        set agentFilter(id) {
            this._agentFilter = id;
            this._page = 0;
        }

        set emptyMessage(msg) { this._emptyMessage = msg; }

        set pageSize(n) { this._pageSize = n; }

        // Reset page counter (useful when external data changes)
        resetPage() { this._page = 0; }

        // Allow external code to set the filter input value programmatically
        setFilter(text) {
            this._filterText = (text || '').toLowerCase();
            this._page = 0;
            const input = this.querySelector('.table-filter');
            if (input) input.value = text || '';
            this.render();
        }

        // Return filtered + sorted + paginated data slice
        _getDisplayData() {
            let filtered = this._rows;

            // Agent filter
            if (this._agentFilter !== 'all') {
                filtered = filtered.filter(row => row._agent === this._agentFilter);
            }

            // Text filter
            if (this._filterText) {
                const ft = this._filterText;
                filtered = filtered.filter(row =>
                    Object.values(row).some(v =>
                        String(v || '').toLowerCase().includes(ft)
                    )
                );
            }

            // Sort
            if (this._sortCol) {
                const colDef = this._columns.find(c => c.key === this._sortCol);
                const accessor = colDef?.sortAccessor || (r => r[this._sortCol]);
                const dir = this._sortDir;
                filtered.sort((a, b) => {
                    const va = accessor(a), vb = accessor(b);
                    if (va == null && vb == null) return 0;
                    if (va == null) return 1;
                    if (vb == null) return -1;
                    if (typeof va === 'number') return (va - vb) * dir;
                    return String(va).localeCompare(String(vb)) * dir;
                });
            }

            // Paginate
            const totalPages = Math.max(1, Math.ceil(filtered.length / this._pageSize));
            const page = Math.min(this._page, totalPages - 1);
            const display = filtered.slice(page * this._pageSize, (page + 1) * this._pageSize);

            return { filtered, display, page, totalPages, total: this._rows.length };
        }

        _handleSort(colKey) {
            if (this._sortCol === colKey) {
                this._sortDir *= -1;
            } else {
                this._sortCol = colKey;
                this._sortDir = -1;
            }
            this._page = 0;
            this.render();
        }

        _handleFilter(e) {
            this._filterText = (e.target.value || '').toLowerCase();
            this._page = 0;
            this.render();
        }

        _handlePage(newPage) {
            this._page = newPage;
            this.render();
        }

        _toggleRow(rowId) {
            if (this._expandedRows.has(rowId)) {
                this._expandedRows.delete(rowId);
            } else {
                this._expandedRows.add(rowId);
            }
            const el = this.querySelector(`#${rowId}`);
            if (el) el.style.display = this._expandedRows.has(rowId) ? 'table-row' : 'none';
        }

        _renderSortHeader(colDef) {
            const sortable = colDef.sortable !== false;
            if (!sortable) return `<th>${colDef.label}</th>`;
            const active = this._sortCol === colDef.key;
            const arrow = active ? (this._sortDir > 0 ? '&#x25B2;' : '&#x25BC;') : '&#x25B4;';
            const ariaSort = active ? (this._sortDir > 0 ? 'ascending' : 'descending') : 'none';
            return `<th class="${active ? 'sort-active' : ''}" role="columnheader" aria-sort="${ariaSort}" data-sort-key="${colDef.key}" style="cursor:pointer" tabindex="0">${colDef.label}<span class="sort-arrow">${arrow}</span></th>`;
        }

        _renderCell(colDef, row) {
            const value = row[colDef.key];
            if (colDef.render) return colDef.render(value, row);
            const text = value != null ? String(value) : '—';
            const escaped = colDef.annotate ? annotateAcronyms(escapeHtml(text)) : escapeHtml(text);
            return colDef.style ? `<td style="${colDef.style}">${escaped}</td>` : `<td>${escaped}</td>`;
        }

        _renderExpandedRow(colDef, row, rowId) {
            if (!colDef.expandable) return '';
            const fullField = colDef.fullTextField || colDef.key;
            const fullText = row[fullField] || '';
            const maxLen = colDef.maxLength || 120;
            if (fullText.length <= maxLen) return '';
            const expanded = this._expandedRows.has(rowId);
            const content = colDef.annotate
                ? annotateAcronyms(escapeHtml(fullText))
                : escapeHtml(fullText);
            return `<tr id="${rowId}" class="expanded-detail-row" style="display:${expanded ? 'table-row' : 'none'}"><td colspan="${this._columns.length}"><div class="expanded-detail">${content}</div></td></tr>`;
        }

        render() {
            if (this._rows.length === 0) {
                this.innerHTML = `
                    <div class="table-toolbar">
                        <input class="table-filter" placeholder="Filter..." value="${escapeHtml(this._filterText)}">
                        <div class="table-page-info"></div>
                        <div class="table-page-btns"></div>
                    </div>
                    <div class="lcars-panel-body scrollable">
                        <div class="kb-table-wrap">
                            <div style="color:var(--text-dim);font-size:0.85em;padding:8px">${this._emptyMessage}</div>
                        </div>
                    </div>`;
                this._attachListeners();
                return;
            }

            const { display, page, totalPages, filtered, total } = this._getDisplayData();

            // Page info text
            const pageInfo = filtered.length < total
                ? `${filtered.length} of ${total} (filtered) · Page ${page + 1}/${totalPages}`
                : `${total} total · Page ${page + 1}/${totalPages}`;

            // Page buttons
            const pageBtns = totalPages > 1
                ? `<button class="table-page-btn" aria-label="Previous page" data-page-delta="-1" ${page === 0 ? 'disabled' : ''}>&#x25C0;</button>
                   <button class="table-page-btn" aria-label="Next page" data-page-delta="1" ${page >= totalPages - 1 ? 'disabled' : ''}>&#x25B6;</button>`
                : '';

            // Header row
            const headerCells = this._columns.map(c => this._renderSortHeader(c)).join('');

            // Body rows
            const bodyRows = display.map((row, idx) => {
                const rowId = `${this._tableId}-row-${page}-${idx}`;
                // Check if any column has expandable content
                let hasExpandable = false;
                let expandRowHtml = '';
                const cells = this._columns.map(colDef => {
                    if (colDef.expandable) {
                        const fullField = colDef.fullTextField || colDef.key;
                        const fullText = row[fullField] || '';
                        const maxLen = colDef.maxLength || 120;
                        if (fullText.length > maxLen) {
                            hasExpandable = true;
                            expandRowHtml = this._renderExpandedRow(colDef, row, rowId);
                        }
                    }
                    return this._renderCell(colDef, row);
                }).join('');
                const trClass = hasExpandable ? 'expandable-row' : '';
                const trAttr = hasExpandable ? `data-expand-id="${rowId}"` : '';
                return `<tr class="${trClass}" ${trAttr}>${cells}</tr>${expandRowHtml}`;
            }).join('');

            this.innerHTML = `
                <div class="table-toolbar">
                    <input class="table-filter" placeholder="Filter..." value="${escapeHtml(this._filterText)}">
                    <div class="table-page-info">${pageInfo}</div>
                    <div class="table-page-btns">${pageBtns}</div>
                </div>
                <div class="lcars-panel-body scrollable">
                    <div class="kb-table-wrap">
                        <table class="kb-table">
                            <thead><tr>${headerCells}</tr></thead>
                            <tbody>${bodyRows}</tbody>
                        </table>
                    </div>
                </div>`;

            this._attachListeners();
        }

        _attachListeners() {
            // Filter input
            const filterInput = this.querySelector('.table-filter');
            if (filterInput) {
                filterInput.addEventListener('input', (e) => this._handleFilter(e));
            }
            // Sort headers
            this.querySelectorAll('th[data-sort-key]').forEach(th => {
                const handler = () => this._handleSort(th.dataset.sortKey);
                th.addEventListener('click', handler);
                th.addEventListener('keydown', (e) => { if (e.key === 'Enter') handler(); });
            });
            // Page buttons
            this.querySelectorAll('[data-page-delta]').forEach(btn => {
                btn.addEventListener('click', () => {
                    const { page } = this._getDisplayData();
                    this._handlePage(page + parseInt(btn.dataset.pageDelta));
                });
            });
            // Expandable rows
            this.querySelectorAll('tr[data-expand-id]').forEach(tr => {
                tr.addEventListener('click', () => this._toggleRow(tr.dataset.expandId));
            });
        }
    }
    customElements.define('mesh-data-table', MeshDataTable);

    // MeshTopology — SVG pentagon topology graph
    class MeshTopology extends HTMLElement {
        constructor() {
            super();
            this._agents = [];
            this._agentStates = {};
        }
        set agents(arr) { this._agents = arr; }
        set agentStates(obj) { this._agentStates = obj; }

        render() {
            const agents = this._agents;
            const agentStates = this._agentStates;
            const cx = 300, cy = 170, r = 130;
            const positions = agents.map((_, i) => {
                const angle = -Math.PI / 2 + (2 * Math.PI * i) / agents.length;
                return { x: Math.round(cx + r * Math.cos(angle)), y: Math.round(cy + r * Math.sin(angle)) };
            });

            let html = '';
            // Draw edges between all pairs
            for (let i = 0; i < agents.length; i++) {
                for (let j = i + 1; j < agents.length; j++) {
                    const a = positions[i], b = positions[j];
                    html += `<line x1="${a.x}" y1="${a.y}" x2="${b.x}" y2="${b.y}" stroke="var(--border-accent)" stroke-width="3" opacity="0.4"/>`;
                }
            }
            // Draw nodes
            for (let i = 0; i < agents.length; i++) {
                const agent = agents[i];
                const pos = positions[i];
                const state = agentStates[agent.id];
                const online = state?.status === 'online';
                const fill = online ? agent.color : 'var(--c-inactive)';
                html += `<g style="cursor:pointer" data-agent-id="${agent.id}">
                    <circle cx="${pos.x}" cy="${pos.y}" r="45" fill="${fill}" opacity="${online ? 0.12 : 0.05}" stroke="${fill}" stroke-width="3"/>
                    <circle cx="${pos.x}" cy="${pos.y}" r="16" fill="${fill}" opacity="${online ? 1 : 0.3}">
                        ${online ? `<animate attributeName="r" values="15;19;15" dur="3s" repeatCount="indefinite"/>` : ''}
                    </circle>
                    <text x="${pos.x}" y="${pos.y + 72}" text-anchor="middle" font-size="21" font-family="inherit" font-weight="bold" fill="var(--text-secondary)">
                        ${agent.id.replace('-agent', '')}
                    </text>
                </g>`;
            }

            this.innerHTML = `<svg class="topology-svg" viewBox="0 0 600 370">${html}</svg>`;

            // Attach click handlers that call global switchAgent + switchTab
            this.querySelectorAll('g[data-agent-id]').forEach(g => {
                g.addEventListener('click', () => {
                    switchAgent(g.dataset.agentId);
                    switchTab('meta');
                });
            });
        }
    }
    customElements.define('mesh-topology', MeshTopology);

    // AgentHealthCard — agent status card for the Pulse tab
    class AgentHealthCard extends HTMLElement {
        constructor() {
            super();
            this._agent = null;
            this._state = null;
            this._manualMode = false;
        }
        set agent(obj) { this._agent = obj; }
        set state(obj) { this._state = obj; }
        set manualMode(b) { this._manualMode = b; }

        render() {
            const agent = this._agent;
            const state = this._state || { status: 'unreachable' };
            this.className = 'lcars-panel agent-card';
            this.dataset.agent = agent.id;
            this.style.cursor = 'pointer';

            if (state.status !== 'online') {
                this.innerHTML = `
                    <div class="lcars-panel-header">${agent.id}</div>
                    <div class="lcars-panel-body">
                        <div class="agent-identity">
                            <span class="agent-name">${agent.id}</span>
                            <span class="agent-status-dot offline" aria-label="offline"></span>
                            <span style="font-size:0.7em;color:var(--c-alert);margin-left:4px">offline</span>
                            ${this._manualMode ? '<span class="manual-badge">MANUAL</span>' : ''}
                        </div>
                        <div style="color: var(--c-alert); font-size: 0.8em; margin-top: 8px">
                            Unreachable${state.error ? ` — ${state.error}` : ''}
                        </div>
                    </div>`;
            } else {
                const d = state.data;
                const budget = d.autonomy_budget || {};
                const hasBudget = typeof budget.budget_spent === 'number' || typeof budget.budget_spent === 'string';
                const spent = hasBudget ? parseInt(budget.budget_spent) : null;
                const cutoff = parseInt(budget.budget_cutoff) || 0;
                const budgetLabel = spent !== null ? (cutoff > 0 ? `${spent}/${cutoff}` : `${spent}`) : '—';
                const pct = (spent !== null && cutoff > 0) ? Math.min(100, Math.round((spent / cutoff) * 100)) : null;
                const budgetClass = pct === null ? 'dim' : pct < 50 ? 'high' : pct < 80 ? 'mid' : 'low';
                const unprocessed = (d.totals || {}).unprocessed || 0;
                const gateCount = (d.active_gates || []).length;
                const schema = d.schema_version || '?';
                const schedule = d.schedule || {};
                const lastSync = schedule.last_sync_time || d.collected_at || '—';
                const syncShort = lastSync !== '—' ? lastSync.split('T')[1]?.substring(0, 8) || lastSync : '—';

                this.innerHTML = `
                    <div class="lcars-panel-header">${agent.id}</div>
                    <div class="lcars-panel-body">
                        <div class="agent-identity">
                            <span class="agent-name">${agent.id}</span>
                            <span class="agent-status-dot online" aria-label="online"></span>
                            <span style="font-size:0.7em;color:var(--c-health);margin-left:4px">online</span>
                            ${this._manualMode ? '<span class="manual-badge">MANUAL</span>' : ''}
                        </div>
                        <div class="agent-metrics">
                            <div class="agent-metric">
                                <div class="agent-metric-value">${budgetLabel}</div>
                                <div class="agent-metric-label">Spent</div>
                            </div>
                            <div class="agent-metric">
                                <div class="agent-metric-value">${unprocessed}</div>
                                <div class="agent-metric-label">Pending</div>
                            </div>
                            <div class="agent-metric">
                                <div class="agent-metric-value">${gateCount}</div>
                                <div class="agent-metric-label">Gates</div>
                            </div>
                        </div>
                        <div class="budget-bar-track">
                            <div class="budget-bar-fill ${budgetClass}" style="width: ${pct}%"></div>
                        </div>
                        <div class="agent-detail-row">
                            <span>Schema v${schema}</span>
                            <span>Last sync: ${syncShort}</span>
                        </div>
                    </div>`;
            }

            // Click navigates to agent detail
            this.onclick = () => { switchAgent(agent.id); switchTab('meta'); };
        }
    }
    customElements.define('agent-health-card', AgentHealthCard);

    // OpsBudgetCard — budget visualization card for Operations tab
    class OpsBudgetCard extends HTMLElement {
        constructor() {
            super();
            this._agentId = '';
            this._color = '#6b7280';
            this._budget = null;
            this._manualMode = false;
            this._offline = false;
            this._noData = false;
        }
        set agentId(str) { this._agentId = str; }
        set color(str) { this._color = str; }
        set budget(obj) { this._budget = obj; }
        set manualMode(b) { this._manualMode = b; }
        set offline(b) { this._offline = b; }
        set noData(b) { this._noData = b; }

        render() {
            const label = this._agentId.replace('-agent', '');
            this.className = 'ops-budget-card';
            this.style.setProperty('--card-accent', this._color);

            if (this._offline) {
                this.style.opacity = '0.4';
                this.innerHTML = `
                    <div class="ops-budget-agent">${label}</div>
                    <div class="ops-budget-credit" style="font-size:1em; color:var(--text-dim)">OFFLINE</div>`;
                return;
            }

            if (this._noData) {
                this.style.opacity = '0.6';
                this.innerHTML = `
                    <div class="ops-budget-agent">${label}</div>
                    <div class="ops-budget-credit" style="font-size:0.9em; color:var(--text-dim)">NO DATA</div>
                    <div class="ops-budget-bar"><div class="ops-budget-fill" style="width:0%"></div></div>
                    <div class="ops-budget-values"><span>Agent not reporting budget</span><span></span></div>`;
                return;
            }

            this.style.opacity = '';
            const b = this._budget;
            const pct = b.pct || 0;
            const barColor = pct > 50 ? '#6aab8e' : pct > 20 ? '#d4944a' : '#c47070';
            const lastAction = b.lastAction || '—';
            const interval = b.interval ?? 300;

            this.innerHTML = `
                <div class="ops-budget-agent">${label}${this._manualMode ? ' <span class="manual-badge">MANUAL</span>' : ''}</div>
                <div class="ops-budget-credit">${b.current}<span style="font-size:0.4em;color:var(--text-secondary)">/${b.max || 50}</span></div>
                <div class="ops-budget-bar">
                    <div class="ops-budget-fill" style="width:${pct}%;background:${barColor}"></div>
                </div>
                <div class="ops-budget-values">
                    <span>Interval: ${Math.round(interval / 60)}min</span>
                    <span>${lastAction !== '—' ? lastAction.substring(11, 16) : '—'}</span>
                </div>`;
        }
    }
    customElements.define('ops-budget-card', OpsBudgetCard);
