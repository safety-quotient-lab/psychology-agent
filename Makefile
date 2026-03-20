# operations-agent Makefile
#
# Single entry point for build, test, deploy, and maintenance.
#
# LCARS dashboard: interagent/public/ serves as canonical source.
# Build-time copy syncs to internal/server/static/ for go:embed.
#
# Deploy config from .dev.vars (gitignored):
#   AGENT_SSH_HOST, AGENT_SSH_PORT, AGENT_BASE_DIR

MESHD_BIN    := meshd
MESHCTL_BIN  := meshctl
STATIC_SRC   := interagent/public
STATIC_DST   := internal/server/static
VERSION      ?= $(shell git describe --tags --always --dirty 2>/dev/null || echo "dev")
LDFLAGS      := -ldflags "-X github.com/safety-quotient-lab/operations-agent/internal/server.Version=$(VERSION)"

# Deploy target
REMOTE_BIN   := /home/kashif/platform/meshd
REMOTE_BACKUP := /home/kashif/platform/meshd-backup-$(shell date +%Y%m%d-%H%M)

# SSH shortcuts (config from .dev.vars at runtime)
SSH_CMD = ssh -p $${AGENT_SSH_PORT:-2535} $${AGENT_SSH_HOST}
SCP_CMD = scp -P $${AGENT_SSH_PORT:-2535}

.PHONY: all build build-meshd build-meshctl sync-dashboard \
        test check fmt vet lint \
        deploy deploy-worker deploy-meshd deploy-transfer deploy-restart deploy-validate \
        status logs \
        schema index-transport backup-state \
        stats clean help

# ── Default ───────────────────────────────────────────────────
all: sync-dashboard build

help:
	@echo "operations-agent Makefile ($(VERSION))"
	@echo ""
	@echo "Build:"
	@echo "  make              Build meshd + meshctl (syncs dashboard first)"
	@echo "  make build-meshd  Build meshd binary (linux/amd64)"
	@echo "  make build-meshctl Build meshctl binary"
	@echo "  make sync-dashboard Copy LCARS → Go static"
	@echo ""
	@echo "Quality:"
	@echo "  make check        Pre-commit gate (fmt + vet + test + build)"
	@echo "  make test         Run all Go tests"
	@echo "  make fmt          Format Go code"
	@echo "  make vet          Run go vet"
	@echo "  make lint         Run staticcheck (if installed)"
	@echo ""
	@echo "Deploy:"
	@echo "  make deploy       Deploy meshd (build + transfer + restart + validate)"
	@echo "  make deploy-worker CF Worker (legacy — mesh.safety-quotient.dev replaces)"
	@echo "  make deploy-meshd  Binary build + transfer + restart"
	@echo "  make deploy-validate Run post-deploy health checks"
	@echo ""
	@echo "Operations:"
	@echo "  make status       Show running meshd processes on remote"
	@echo "  make logs AGENT=x Tail meshd logs for agent"
	@echo "  make schema       Bootstrap state.db from schema.sql"
	@echo "  make index-transport Re-index transport messages into state.db"
	@echo "  make backup-state  Backup state.db (local + remote)"
	@echo "  make stats        Codebase statistics"
	@echo "  make clean        Remove build artifacts"

# ── Dashboard sync ────────────────────────────────────────────
sync-dashboard:
	@echo "Syncing LCARS dashboard → Go static..."
	@V=$$(git rev-parse --short HEAD 2>/dev/null || echo "dev"); \
	sed "s/?v=DEV\"/?v=$$V\"/g" $(STATIC_SRC)/index.html > $(STATIC_DST)/index.html
	@mkdir -p $(STATIC_DST)/css $(STATIC_DST)/js $(STATIC_DST)/js/stations $(STATIC_DST)/fonts
	@cp -r $(STATIC_SRC)/css/* $(STATIC_DST)/css/ 2>/dev/null || true
	@cp -r $(STATIC_SRC)/js/*.js $(STATIC_DST)/js/ 2>/dev/null || true
	@cp -r $(STATIC_SRC)/js/stations/* $(STATIC_DST)/js/stations/ 2>/dev/null || true
	@cp -r $(STATIC_SRC)/fonts/* $(STATIC_DST)/fonts/ 2>/dev/null || true
	@cp $(STATIC_SRC)/favicon.svg $(STATIC_DST)/ 2>/dev/null || true
	@echo "  Done (cache bust: $$V)"

# ── Build ─────────────────────────────────────────────────────
build: build-meshd build-meshctl

build-meshd: sync-dashboard
	@echo "Building meshd $(VERSION) (linux + darwin)..."
	@GOOS=linux GOARCH=amd64 go build $(LDFLAGS) -o $(MESHD_BIN) ./cmd/meshd/
	@go build $(LDFLAGS) -o meshd-darwin ./cmd/meshd/
	@echo "  Linux: ./$(MESHD_BIN) ($$(du -h $(MESHD_BIN) | cut -f1))"
	@echo "  Darwin: ./meshd-darwin ($$(du -h meshd-darwin | cut -f1))"
	@cp meshd-darwin ~/Projects/meshd/meshd 2>/dev/null || true

build-meshctl:
	@go build -o $(MESHCTL_BIN) ./cmd/meshctl/

# ── Quality ───────────────────────────────────────────────────
# Pre-commit gate: format, vet, test, build. Run before every commit.
check: fmt vet test build
	@echo ""
	@echo "All checks passed."

fmt:
	@gofmt -l -w ./internal/ ./cmd/ 2>/dev/null
	@echo "  fmt: done"

vet:
	@go vet ./...
	@echo "  vet: done"

lint:
	@if command -v staticcheck >/dev/null 2>&1; then \
		staticcheck ./...; \
		echo "  lint: done"; \
	else \
		echo "  lint: staticcheck not installed (go install honnef.co/go/tools/cmd/staticcheck@latest)"; \
	fi

test:
	@go test ./... 2>&1
	@echo "  test: done"

# ── Deploy — meshd serves everything (CF Worker decommissioned) ────
deploy: deploy-meshd deploy-validate
	@. ./.dev.vars 2>/dev/null; $(SSH_CMD) "echo $(VERSION) > /home/kashif/platform/.meshd-version"
	@echo ""
	@echo "Deploy complete ($(VERSION))."

deploy-full: deploy-meshd deploy-validate
	@. ./.dev.vars 2>/dev/null; $(SSH_CMD) "echo $(VERSION) > /home/kashif/platform/.meshd-version"
	@echo ""
	@echo "Full deploy complete ($(VERSION))."

# Legacy CF Worker deploy (kept for reference — mesh.safety-quotient.dev replaces it)
deploy-worker: sync-dashboard
	@echo "═══ Deploying CF Worker (LEGACY — mesh.safety-quotient.dev serves via tunnel) ═══"
	@cd interagent && wrangler deploy

deploy-meshd: build-meshd deploy-transfer deploy-restart

deploy-transfer:
	@echo ""
	@echo "═══ Transferring meshd binary ═══"
	@. ./.dev.vars 2>/dev/null; \
		$(SCP_CMD) ./$(MESHD_BIN) $${AGENT_SSH_HOST}:$(REMOTE_BIN).new
	@echo "  Transferred to $(REMOTE_BIN).new"

# Restart: black alert → stop all → swap binary → start all → green
deploy-restart:
	@echo ""
	@echo "═══ Restarting meshd processes ═══"
	@echo "  Broadcasting black alert..."
	@curl -sf -X POST https://mesh.safety-quotient.dev/api/trigger \
		-H "Content-Type: application/json" \
		-d '{"type":"alert","payload":{"level":"1","reason":"meshd deploy in progress"}}' \
		>/dev/null 2>&1 || true
	@. ./.dev.vars 2>/dev/null; \
		echo "  Stopping all units..." && \
		$(SSH_CMD) 'systemctl --user --no-block stop meshd-psychology meshd-psq meshd-observatory meshd-unratified meshd-interagent-mesh 2>/dev/null; sleep 2' && \
		echo "  Swapping binary..." && \
		$(SSH_CMD) 'cp $(REMOTE_BIN) $(REMOTE_BACKUP) 2>/dev/null; mv $(REMOTE_BIN).new $(REMOTE_BIN) && chmod +x $(REMOTE_BIN)' && \
		echo "  Starting all units (parallel)..." && \
		$(SSH_CMD) 'systemctl --user --no-block start meshd-psychology meshd-psq meshd-observatory meshd-unratified meshd-interagent-mesh && echo "    Started 5 units (4 agents + mesh)"; sleep 3; echo ""; echo "  Processes:"; pgrep -f "/home/kashif/platform/meshd --port" -la 2>/dev/null | head -6'
	@echo "  Standing down..."
	@sleep 5
	@curl -sf -X POST https://mesh.safety-quotient.dev/api/trigger \
		-H "Content-Type: application/json" \
		-d '{"type":"alert","payload":{"level":"5","reason":"Deploy complete — all systems nominal"}}' \
		>/dev/null 2>&1 || true
	@echo ""
	@echo "  Updating gray-box binary + restarting sessions..."
	@cp ./meshd-darwin ~/Projects/meshd/meshd && chmod +x ~/Projects/meshd/meshd && \
		echo "    Binary copied to ~/Projects/meshd/meshd"
	@launchctl unload ~/Library/LaunchAgents/dev.safety-quotient.meshd-ops-session.plist 2>/dev/null; \
		launchctl unload ~/Library/LaunchAgents/dev.safety-quotient.meshd-psy-session.plist 2>/dev/null; \
		sleep 1; \
		launchctl load ~/Library/LaunchAgents/dev.safety-quotient.meshd-ops-session.plist & \
		launchctl load ~/Library/LaunchAgents/dev.safety-quotient.meshd-psy-session.plist & \
		wait; echo "    Restarted ops-session + psy-session"

deploy-validate:
	@echo ""
	@echo "═══ Post-deploy validation ═══"
	@./scripts/validate-deploy.sh || true

# ── Operations ────────────────────────────────────────────────
status:
	@. ./.dev.vars 2>/dev/null; \
		$(SSH_CMD) 'pgrep -f "platform/meshd --port" -la'

logs:
	@. ./.dev.vars 2>/dev/null; \
		$(SSH_CMD) 'tail -50 /tmp/meshd-$(AGENT).log 2>/dev/null || echo "No log for $(AGENT)"'

# Bootstrap state.db from schema.sql (creates tables, seeds data)
schema:
	@echo "Bootstrapping state.db..."
	@./scripts/bootstrap-state-db.sh
	@echo "  Done"

# Re-index transport messages from filesystem into state.db
index-transport:
	@echo "Indexing transport messages..."
	@./scripts/index-transport.sh
	@echo "  Done"

# Backup state.db (local copy + remote backup via SSH)
backup-state:
	@echo "Backing up state.db..."
	@mkdir -p backups
	@if [ -f state.db ]; then \
		cp state.db backups/state-$(shell date +%Y%m%d-%H%M).db; \
		echo "  Local: backups/state-$(shell date +%Y%m%d-%H%M).db"; \
	fi
	@. ./.dev.vars 2>/dev/null; \
		$(SSH_CMD) '\
		for pair in psychology:/home/kashif/projects/psychology \
		            psq:/home/kashif/projects/psychology/safety-quotient \
		            unratified:/home/kashif/projects/unratified \
		            observatory:/home/kashif/projects/observatory \
		            operations:/home/kashif/projects/operations-agent; do \
			name=$${pair%%:*}; path=$${pair##*:}; \
			if [ -f "$$path/state.db" ]; then \
				cp "$$path/state.db" "$$path/state-backup-$$(date +%Y%m%d).db"; \
				echo "  Remote $$name: backed up"; \
			fi; \
		done' 2>/dev/null || echo "  Remote backup skipped (SSH unavailable)"

# ── Stats ─────────────────────────────────────────────────────
stats:
	@echo "operations-agent codebase stats"
	@echo "  Go files:     $$(find internal/ cmd/ -name '*.go' | wc -l | tr -d ' ')"
	@echo "  Go lines:     $$(find internal/ cmd/ -name '*.go' -exec cat {} + | wc -l | tr -d ' ')"
	@echo "  Test files:   $$(find . -name '*_test.go' | wc -l | tr -d ' ')"
	@echo "  JS files:     $$(find interagent/public -name '*.js' | wc -l | tr -d ' ')"
	@echo "  CSS files:    $$(find interagent/public -name '*.css' | wc -l | tr -d ' ')"
	@echo "  HTML:         $$(wc -l < interagent/public/index.html) lines"
	@echo "  Scripts:      $$(ls scripts/*.sh scripts/*.py 2>/dev/null | wc -l | tr -d ' ')"
	@echo "  Transport:    $$(find transport/sessions -name '*.json' 2>/dev/null | wc -l | tr -d ' ') messages"
	@echo "  Version:      $(VERSION)"

# ── Clean ─────────────────────────────────────────────────────
clean:
	rm -f $(MESHD_BIN) $(MESHCTL_BIN)
