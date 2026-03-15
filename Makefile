# operations-agent Makefile
#
# Single entry point for build, test, and deploy.
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

# Deploy target (loaded from .dev.vars at runtime)
REMOTE_BIN   := /home/kashif/platform/meshd
REMOTE_BACKUP := /home/kashif/platform/meshd-backup-$(shell date +%Y%m%d-%H%M)

# Load .dev.vars for SSH config
-include .dev.vars.mk
SSH_CMD = ssh -p $${AGENT_SSH_PORT:-2535} $${AGENT_SSH_HOST}
SCP_CMD = scp -P $${AGENT_SSH_PORT:-2535}

.PHONY: all build build-meshd build-meshctl sync-dashboard test clean \
        deploy deploy-worker deploy-meshd deploy-transfer deploy-restart \
        deploy-validate status

all: sync-dashboard build

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

# ── Test ──────────────────────────────────────────────────────
test:
	go test ./...

# ── Full deploy (CF Worker + meshd binary + restart) ──────────
deploy: deploy-worker deploy-meshd deploy-validate
	@echo ""
	@echo "Deploy complete ($(VERSION))."

# CF Worker deploy
deploy-worker: sync-dashboard
	@echo "═══ Deploying CF Worker ═══"
	@cd interagent && wrangler deploy

# Build + transfer + restart meshd on remote host
deploy-meshd: build-meshd deploy-transfer deploy-restart

# Transfer binary to remote host
deploy-transfer:
	@echo ""
	@echo "═══ Transferring meshd binary ═══"
	@. ./.dev.vars 2>/dev/null; \
		$(SCP_CMD) ./$(MESHD_BIN) $${AGENT_SSH_HOST}:$(REMOTE_BIN).new
	@echo "  Transferred to $(REMOTE_BIN).new"

# Backup + swap + restart all meshd processes
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

# Post-deploy validation
deploy-validate:
	@echo ""
	@echo "═══ Post-deploy validation ═══"
	@./scripts/validate-deploy.sh || true

# ── Status ────────────────────────────────────────────────────
status:
	@. ./.dev.vars 2>/dev/null; \
		$(SSH_CMD) 'pgrep -la "platform/meshd --port"'

# ── Clean ─────────────────────────────────────────────────────
clean:
	rm -f $(MESHD_BIN) $(MESHCTL_BIN)
