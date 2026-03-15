# operations-agent Makefile
#
# LCARS dashboard: interagent/public/ serves as canonical source.
# Build-time copy syncs to internal/server/static/ for go:embed.
# Non-dashboard static files (vocab, agent-card, agent-dashboard)
# remain in internal/server/static/ — they belong to Go, not LCARS.

MESHD_BIN    := meshd
MESHCTL_BIN  := meshctl
STATIC_SRC   := interagent/public
STATIC_DST   := internal/server/static
VERSION      ?= $(shell git describe --tags --always --dirty 2>/dev/null || echo "dev")
LDFLAGS      := -ldflags "-X github.com/safety-quotient-lab/operations-agent/internal/server.Version=$(VERSION)"

.PHONY: all build build-meshd build-meshctl sync-dashboard test clean deploy

all: sync-dashboard build

# ── Dashboard sync ────────────────────────────────────────────
# Copy LCARS canonical dashboard to Go embed directory.
# Preserves non-dashboard files (vocab, agent-card, agent-dashboard).
sync-dashboard:
	@echo "Syncing LCARS dashboard → Go static..."
	@cp $(STATIC_SRC)/index.html $(STATIC_DST)/index.html
	@mkdir -p $(STATIC_DST)/css $(STATIC_DST)/js
	@cp -r $(STATIC_SRC)/css/* $(STATIC_DST)/css/ 2>/dev/null || true
	@cp -r $(STATIC_SRC)/js/* $(STATIC_DST)/js/ 2>/dev/null || true
	@echo "  Done — $(STATIC_DST)/index.html updated from LCARS canonical"

# ── Build ─────────────────────────────────────────────────────
build: build-meshd build-meshctl

build-meshd: sync-dashboard
	go build $(LDFLAGS) -o $(MESHD_BIN) ./cmd/meshd/

build-meshctl:
	go build -o $(MESHCTL_BIN) ./cmd/meshctl/

# ── Test ──────────────────────────────────────────────────────
test:
	go test ./...

# ── Deploy ────────────────────────────────────────────────────
deploy: sync-dashboard
	@echo "Deploying CF Worker..."
	cd interagent && wrangler deploy
	@echo ""
	@echo "Building meshd binary..."
	go build $(LDFLAGS) -o $(MESHD_BIN) ./cmd/meshd/
	@echo "Binary ready: ./$(MESHD_BIN) ($(VERSION))"
	@echo "Transfer to deployment host and restart meshd service."

# ── Clean ─────────────────────────────────────────────────────
clean:
	rm -f $(MESHD_BIN) $(MESHCTL_BIN)
