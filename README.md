# AI Privacy Proxy

Self-hosted privacy gateway that sits between AI clients and AI providers/routers.

Sensitive data is detected, tokenized, and kept within your trusted boundary — AI providers only receive sanitized requests.

## Quick Start

```bash
# 1. Copy env template
cp .env.example .env
# Edit .env: set UPSTREAM_BASE_URL, ADMIN_API_KEY

# 2. Start all services
docker compose up --build

# Proxy:     http://localhost:8080
# Dashboard: http://localhost:8080/dashboard
```

## How It Works

```
Claude Code / Codex / App
        ↓
AI Privacy Proxy          ← detects & tokenizes sensitive data
        ↓
9router / AI Provider     ← receives only sanitized requests
        ↓
AI Privacy Proxy          ← restores tokens in response (incl. streaming)
        ↓
Client
```

## Tech Stack

- **Proxy**: Node.js 22 + TypeScript + Fastify
- **Privacy Detection**: Microsoft Presidio (Python)
- **Token Vault**: Redis 7
- **Dashboard**: Vite + React + shadcn/ui
- **Deploy**: Docker Compose

## Development

```bash
corepack enable
pnpm install

# Run proxy
pnpm --filter proxy dev

# Run dashboard (in another terminal)
pnpm --filter dashboard dev
```

## Documentation

See `planning/` folder (not tracked in git):
- `AI_Privacy_Proxy_PRD.md` — Product Requirements Document
- `IMPLEMENTATION_PLAN.md` — Implementation plan with phase checklists
