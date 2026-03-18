# Chromabook Cloudflare Tunnel Setup

Routes all agent subdomains directly to meshd ports on the Chromabook.
Replaces CF Worker proxying — meshd serves everything (API, dashboard, cards).

## Prerequisites

```bash
# Install cloudflared if not present
# https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/downloads/
cloudflared --version
```

## Step 1: Create tunnel (one-time)

```bash
cloudflared tunnel login
cloudflared tunnel create mesh-agents
```

Note the tunnel ID from the output (e.g., `a1b2c3d4-...`).

## Step 2: Configure tunnel

Create/edit `~/.cloudflared/config.yml`:

```yaml
tunnel: <TUNNEL_ID>
credentials-file: /home/kashif/.cloudflared/<TUNNEL_ID>.json

ingress:
  # Psychology agent
  - hostname: psychology-agent.safety-quotient.dev
    service: http://localhost:8076

  # Safety Quotient (PSQ) agent
  - hostname: psq-agent.safety-quotient.dev
    service: http://localhost:8077

  # Unratified agent
  - hostname: unratified-agent.unratified.org
    service: http://localhost:8078

  # Observatory agent
  - hostname: observatory-agent.unratified.org
    service: http://localhost:8079

  # Operations agent
  - hostname: operations-agent.safety-quotient.dev
    service: http://localhost:8081

  # Interagent mesh compositor (served by operations-agent meshd)
  - hostname: interagent.safety-quotient.dev
    service: http://localhost:8081

  # Catch-all
  - service: http_status:404
```

## Step 3: Create DNS records

```bash
# safety-quotient.dev subdomains
cloudflared tunnel route dns mesh-agents psychology-agent.safety-quotient.dev
cloudflared tunnel route dns mesh-agents psq-agent.safety-quotient.dev
cloudflared tunnel route dns mesh-agents operations-agent.safety-quotient.dev
cloudflared tunnel route dns mesh-agents interagent.safety-quotient.dev

# unratified.org subdomains
cloudflared tunnel route dns mesh-agents unratified-agent.unratified.org
cloudflared tunnel route dns mesh-agents observatory-agent.unratified.org
```

## Step 4: Run as systemd service

```bash
sudo cloudflared service install
sudo systemctl enable cloudflared
sudo systemctl start cloudflared
```

Or run manually:
```bash
cloudflared tunnel run mesh-agents
```

## Step 5: Verify

```bash
curl -s https://psychology-agent.safety-quotient.dev/api/status | jq .health
curl -s https://unratified-agent.unratified.org/api/status | jq .health
curl -s https://operations-agent.safety-quotient.dev/api/status | jq .health
curl -s https://interagent.safety-quotient.dev/ | head -5
```

All should return health data from meshd (not the old CF Worker).

## Step 6: Decommission CF Workers

Once tunnel routing verified:
1. Remove `interagent-mesh` Worker from Cloudflare dashboard
2. Remove `wrangler.toml` deploy from Makefile
3. Update AGENTS array in dashboard JS to use new URLs if any changed

## Port Mapping

| Agent | Port | Public URL |
|-------|------|-----------|
| psychology-agent | 8076 | psychology-agent.safety-quotient.dev |
| psq-agent | 8077 | psq-agent.safety-quotient.dev |
| unratified-agent | 8078 | unratified-agent.unratified.org |
| observatory-agent | 8079 | observatory-agent.unratified.org |
| operations-agent | 8081 | operations-agent.safety-quotient.dev |
| interagent mesh | 8081 | interagent.safety-quotient.dev |

## Mac Sessions (already tunneled)

ops-session (8083) and psy-session (8082) already route via Mac cloudflared.
No changes needed for those.
