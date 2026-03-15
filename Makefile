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
	@echo "  make deploy       Full deploy (CF Worker + binary + restart + validate)"
	@echo "  make deploy-worker CF Worker only"
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
	@cp $(STATIC_SRC)/index.html $(STATIC_DST)/index.html
	@mkdir -p $(STATIC_DST)/css $(STATIC_DST)/js
	@cp -r $(STATIC_SRC)/css/* $(STATIC_DST)/css/ 2>/dev/null || true
	@cp -r $(STATIC_SRC)/js/* $(STATIC_DST)/js/ 2>/dev/null || true
	@echo "  Done"

# ── Build ─────────────────────────────────────────────────────
build: build-meshd build-meshctl

build-meshd: sync-dashboard
	@echo "Building meshd $(VERSION)..."
	@GOOS=linux GOARCH=amd64 go build $(LDFLAGS) -o $(MESHD_BIN) ./cmd/meshd/
	@echo "  Binary: ./$(MESHD_BIN) ($$(du -h $(MESHD_BIN) | cut -f1))"

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

# ── Full deploy ───────────────────────────────────────────────
deploy: deploy-worker deploy-meshd deploy-validate
	@echo ""
	@echo "Deploy complete ($(VERSION))."

deploy-worker: sync-dashboard
	@echo "═══ Deploying CF Worker ═══"
	@cd interagent && wrangler deploy

deploy-meshd: build-meshd deploy-transfer deploy-restart

deploy-transfer:
	@echo ""
	@echo "═══ Transferring meshd binary ═══"
	@. ./.dev.vars 2>/dev/null; \
		$(SCP_CMD) ./$(MESHD_BIN) $${AGENT_SSH_HOST}:$(REMOTE_BIN).new
	@echo "  Transferred to $(REMOTE_BIN).new"

deploy-restart:
	@echo ""
	@echo "═══ Restarting meshd processes ═══"
	@. ./.dev.vars 2>/dev/null; \
		$(SSH_CMD) '\
		cp $(REMOTE_BIN) $(REMOTE_BACKUP) && \
		mv $(REMOTE_BIN).new $(REMOTE_BIN) && \
		chmod +x $(REMOTE_BIN) && \
		echo "  Backup: $(REMOTE_BACKUP)" && \
		echo "  Swapped binary" && \
		for pid in $$(pgrep -f "platform/meshd --port"); do \
			agent=$$(ps -p $$pid -o args= | grep -oP "(?<=--agent-id )\S+"); \
			echo "  Restarting $$agent (pid $$pid)..."; \
			cmd=$$(ps -p $$pid -o args=); \
			kill $$pid; sleep 1; \
			nohup $$cmd > /tmp/meshd-$$agent.log 2>&1 & \
			echo "    Started (pid $$!)"; \
		done && \
		sleep 2 && \
		echo "" && \
		echo "  Running processes:" && \
		pgrep -la "platform/meshd --port" || echo "  WARNING: no meshd processes found"'

deploy-validate:
	@echo ""
	@echo "═══ Post-deploy validation ═══"
	@./scripts/validate-deploy.sh || true

# ── Operations ────────────────────────────────────────────────
status:
	@. ./.dev.vars 2>/dev/null; \
		$(SSH_CMD) 'pgrep -la "platform/meshd --port"'

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
