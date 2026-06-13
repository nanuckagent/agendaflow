# AgendaFlow

Plataforma de agendamento inteligente com suporte a multi-tenancy, calendários compartilhados e integração com sistemas externos.

## Features

- 📅 **Booking público por tenant** — URL `/b/{slug}` com fluxo multi-step, disponibilidade real e schedules por profissional
- 👥 **Multi-tenancy** — Workspaces isolados com branding customizado (cores + logo) aplicado em runtime
- 🔐 **Auth completa** — Signup self-service, login email/senha, **reset de senha**, **verificação de email**, **Google OAuth** (vínculo automático por email)
- 💳 **MercadoPago PIX por tenant** — Cada workspace configura seu próprio access token; QR PIX no checkout, polling de status, webhook idempotente, expiração automática de reservas não pagas (40 min)
- 🛒 **Módulo loja opcional** — CRUD de produtos com checkout por WhatsApp (deep link `wa.me`)
- 📧 **Pipeline de email assíncrono** — Templates PT-BR via BullMQ + nodemailer (Brevo SMTP); degrada para logs do worker quando credenciais não estão configuradas
- 🔒 **PII criptografada** — Email/telefone do cliente em AES-256-GCM com chave derivada por workspace; hash SHA-256 para lookups
- 📱 **Responsivo + PT-BR nativo** — i18n react-i18next com pt-BR default, timezone America/Sao_Paulo, R$ e dd/mm/yyyy
- 🚀 **Stack moderna** — Hono + Drizzle + BullMQ no backend; React 18 + TanStack Router/Query + Zustand no frontend

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
│   ├── AUTH.md                     # Reset de senha, verificação, Google OAuth
│   ├── PAYMENTS.md                 # MercadoPago PIX por tenant
│   └── CREDENTIALS.md              # Guias Brevo SMTP, Google Cloud, MercadoPago
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

- **Authentication:** JWT HS256 (access 15min, refresh 7 dias em cookie httpOnly SameSite=Strict)
- **Password Hashing:** Argon2id (OWASP recommended)
- **CSRF:** SameSite=Strict + `Content-Type: application/json` (sem double-submit tokens — ver CLAUDE.md)
- **CORS:** Configured to allow frontend origin
- **HTTPS:** Enforced in production via Traefik + Cloudflare
- **Input Validation:** Zod schemas em todas as rotas (`safeParse` → RFC7807)
- **Rate Limiting:** Redis fixed-window por prefix (register 5/15min, login 10/15min, forgot/reset 5–10/15min, webhook MP 60/min)
- **Password reset:** Token redis single-use (getdel) com TTL 30min + revogação de todas as sessões
- **Verificação de email:** Token TTL 48h; login NÃO bloqueia, banner amber no dashboard
- **PII em repouso:** AES-256-GCM por workspace (`encryptPII(value, workspaceKey)`)
- **MercadoPago token:** Criptografado com chave `${JWT_SECRET}:${workspaceId}` (nunca workspaceId puro)
- **Webhook:** Nunca confia no body — re-busca o pagamento na API MP com o token do tenant; idempotente; sempre 200

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
- **[docs/AUTH.md](docs/AUTH.md)** — Password reset, email verification, Google OAuth
- **[docs/PAYMENTS.md](docs/PAYMENTS.md)** — MercadoPago PIX integration (per-tenant)
- **[docs/CREDENTIALS.md](docs/CREDENTIALS.md)** — Step-by-step guides: Brevo SMTP, Google Cloud Console, MercadoPago
- **[docs/MULTI_TENANCY.md](docs/MULTI_TENANCY.md)** — Data isolation strategy

## License

Proprietary — See LICENSE file
