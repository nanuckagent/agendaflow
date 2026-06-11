# AgendaFlow

Plataforma de agendamento inteligente com suporte a multi-tenancy, calendários compartilhados e integração com sistemas externos.

## Features

- 📅 **Smart Scheduling** — Intelligent calendar management with conflict detection
- 👥 **Multi-Tenancy** — Complete data isolation for multiple organizations
- 🔗 **Calendar Sharing** — Seamless sharing between team members
- 🔐 **Secure Auth** — JWT + Argon2id with role-based access control
- ⚡ **Real-time** — WebSocket support for live updates (Phase 2)
- 📱 **Mobile Ready** — Responsive design, PWA support
- 🌐 **Integrations** — Google Calendar, Outlook, Slack (Phase 2)
- 📊 **Analytics** — Event trends, team insights
- 🚀 **Scalable** — Built for distributed systems

## Quick Start

### Prerequisites

- Node.js 20+ (or use `nvm install 20`)
- Docker & Docker Compose
- Git

### Local Development (5 minutes)

```bash
# 1. Clone and install
git clone https://github.com/nanuckagent/agendaflow.git
cd agendaflow
npm install

# 2. Setup environment
cp .env.example .env.development

# 3. Start services
make up

# 4. Run migrations & seed data
make migrate
make seed

# 5. Open in browser
# Frontend: http://localhost:3000
# Backend: http://localhost:8000
# Adminer (DB): http://localhost:8080
```

### Verify Everything is Working

```bash
# Health checks
make health

# View logs
make logs

# Run tests
make test

# View available commands
make help
```

## Development

### Watch Mode (Auto-rebuild)

```bash
# All packages
npm run dev

# Specific package
npm run dev -w agendaflow-backend
npm run dev -w agendaflow-frontend
```

### Build

```bash
# Production build
npm run build --workspaces

# Type checking only (no build)
npm run typecheck --workspaces
```

### Testing

```bash
# Unit tests
make test

# With coverage
make test-coverage

# E2E tests (Playwright)
make test-e2e

# Security audit
make security-scan
```

### Database

```bash
# Run migrations
make migrate

# Create new migration
make migrate-new

# Open PostgreSQL shell
make shell-db

# Open Redis shell
make shell-redis

# Seed initial data
make seed
```

## Docker

### Development Stack

```bash
make up          # Start all (db, redis, backend, worker, frontend)
make down        # Stop all
make logs        # Stream logs from all containers
make status      # Show container status
make clean       # Remove containers + volumes
```

Local Services:
- **Frontend:** http://localhost:3000 (Nginx with SPA routing)
- **Backend:** http://localhost:8000 (Hono API)
- **PostgreSQL:** localhost:5432
- **Redis:** localhost:6379

### Production Deployment

See [DEPLOY.md](./DEPLOY.md) for:
- VPS setup with Traefik
- Docker image building & pushing
- Automated GitHub Actions CI/CD
- SSL/TLS with Cloudflare
- Health monitoring
- Backup & recovery

## Architecture

### Tech Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| **Frontend** | React 18 + Vite | UI/UX, fast dev experience |
| **API** | Hono + TypeScript | Lightweight, type-safe backend |
| **Database** | PostgreSQL 16 | Relational data, ACID guarantees |
| **Cache/Queue** | Redis 7 + BullMQ | Session cache, background jobs |
| **Worker** | BullMQ Consumer | Async job processing (emails, integrations) |
| **Infrastructure** | Docker Compose | Local dev, single host deployment |
| **Reverse Proxy** | Traefik | Production HTTPS, routing |
| **CI/CD** | GitHub Actions | Automated testing, building, deploying |

### Project Structure

```
agendaflow/
├── infra/
│   ├── docker/
│   │   ├── backend.Dockerfile      # Multi-stage Node.js build
│   │   ├── frontend.Dockerfile     # Node build + Nginx runtime
│   │   └── worker.Dockerfile       # BullMQ worker process
│   ├── docker-compose.yml          # Local dev stack
│   ├── docker-compose.prod.yml     # Production stack (Traefik)
│   └── scripts/                    # Deployment utilities
│
├── src/
│   ├── shared/                     # Monorepo shared types
│   │   ├── src/schemas/            # Zod validation schemas
│   │   └── package.json
│   │
│   ├── backend/                    # Node.js/Hono API server
│   │   ├── src/
│   │   │   ├── app.ts              # Hono app setup
│   │   │   ├── routes/             # API endpoints
│   │   │   ├── db/                 # Drizzle ORM schema
│   │   │   ├── services/           # Business logic
│   │   │   ├── middleware/         # Auth, logging, error handling
│   │   │   └── workers/            # BullMQ job handlers
│   │   ├── dist/                   # Compiled JavaScript (gitignored)
│   │   └── package.json
│   │
│   └── frontend/                   # React 18 SPA (Vite)
│       ├── src/
│       │   ├── App.tsx             # Root component
│       │   ├── pages/              # Route pages
│       │   ├── components/         # Reusable UI components
│       │   ├── hooks/              # Custom React hooks
│       │   ├── lib/                # API client, query client
│       │   └── styles/             # TailwindCSS + global styles
│       ├── dist/                   # Built static files (gitignored)
│       ├── vite.config.ts
│       └── package.json
│
├── docs/
│   ├── README.md                   # Architecture overview
│   ├── MULTI_TENANCY.md            # Data isolation strategy
│   └── API.md                      # API reference (generated)
│
├── .github/workflows/
│   ├── ci.yml                      # Lint, test, build
│   └── deploy.yml                  # Build images, deploy to VPS
│
├── CLAUDE.md                       # Non-negotiable rules
├── DEPLOY.md                       # Production deployment guide
├── Makefile                        # Common development tasks
├── docker-compose.yml              # Local dev stack
└── package.json                    # Monorepo root
```

### Multi-Tenancy Design

Each organization (tenant) has isolated:
- ✅ Users with role-based access (admin, member, viewer)
- ✅ Calendars and events
- ✅ Workspace settings and integrations

Data isolation via `tenant_id` in all database tables. See [MULTI_TENANCY.md](docs/MULTI_TENANCY.md) for details.

### Security

- **Authentication:** JWT with long expiry (7 days)
- **Password Hashing:** Argon2id (OWASP recommended)
- **CORS:** Configured to allow frontend origin
- **HTTPS:** Enforced in production via Traefik + Cloudflare
- **Input Validation:** Zod schemas on all routes
- **Rate Limiting:** Per-IP, per-tenant limits to prevent abuse
- **Headers:** CSP, X-Frame-Options, X-Content-Type-Options

## API Reference

### Health Checks

```bash
# Liveness (is the server running?)
curl http://localhost:8000/healthz
# → {"status":"ok","timestamp":"2024-06-11T..."}

# Readiness (are dependencies healthy?)
curl http://localhost:8000/readyz
# → {"status":"ok","database":"healthy","redis":"healthy"}
```

### Authentication

```bash
# Login
curl -X POST http://localhost:8000/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"..."}'
# → {"token":"eyJhbGc...","expiresIn":604800}

# All subsequent requests require:
# Authorization: Bearer <token>
```

See `docs/API.md` for full API reference (generated from OpenAPI spec).

## Monitoring

### Logs

```bash
# All services
make logs

# Specific service
make logs-backend
make logs-worker
make logs-frontend

# Real-time JSON structured logs
docker compose logs -f --format json
```

### Health Endpoints

```bash
# See current health status
make health

# Or manually
curl http://localhost:8000/readyz | jq .
```

### Metrics (Production)

```bash
# Available at /metrics endpoint (admin IP whitelist)
curl https://agendaflow.nanuck.com.br/metrics
# → Prometheus format metrics
```

## Troubleshooting

### Services won't start

```bash
# Check Docker is running
docker ps

# Check for port conflicts
lsof -i :3000 :8000 :5432 :6379

# View container logs
docker compose logs backend
```

### Database connection error

```bash
# Verify PostgreSQL is healthy
make shell-db

# Check DATABASE_URL in .env.development
grep DATABASE_URL .env.development

# Reset database
make clean
make up
make migrate
```

### Frontend build failed

```bash
# Clear node_modules and reinstall
rm -rf src/frontend/node_modules
npm ci -w agendaflow-frontend

# Rebuild
npm run build -w agendaflow-frontend
```

For more issues, see [DEPLOY.md Troubleshooting](DEPLOY.md#troubleshooting).

## Contributing

1. **Clone:** `git clone https://github.com/nanuckagent/agendaflow.git`
2. **Branch:** `git checkout -b feature/my-feature`
3. **Develop:** Follow the architecture patterns in [CLAUDE.md](CLAUDE.md)
4. **Test:** `make test` before committing
5. **Commit:** Use conventional commits: `feat: add calendar sharing`
6. **Push:** `git push origin feature/my-feature`
7. **PR:** Open pull request; CI runs automatically

## Documentation

- **[CLAUDE.md](CLAUDE.md)** — Non-negotiable rules, design decisions
- **[DEPLOY.md](DEPLOY.md)** — Production deployment guide
- **[docs/README.md](docs/README.md)** — Architecture & ADRs
- **[docs/MULTI_TENANCY.md](docs/MULTI_TENANCY.md)** — Data isolation strategy
- **[docs/API.md](docs/API.md)** — API reference (auto-generated)

## License

Proprietary — See LICENSE file
