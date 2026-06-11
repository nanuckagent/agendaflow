# AgendaFlow Architecture Documentation

Complete system architecture, design decisions, and best practices for AgendaFlow.

## Core Architecture

### System Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                       FRONTEND (React SPA)                       │
│              Vite Dev Server (port 3000)                         │
│              Nginx Production (via Traefik)                      │
└────────────────┬────────────────────────────────────────────────┘
                 │ HTTPS
                 ▼
┌─────────────────────────────────────────────────────────────────┐
│                     TRAEFIK REVERSE PROXY                        │
│            (Production: SSL/TLS, routing, load balancing)        │
├─────────────────────────────────────────────────────────────────┤
│   /v1 (API) │ /metrics (admin) │ /healthz │ /readyz │ / (SPA)  │
└────┬───────┴────────┬─────────┴─────┬────┴────┬────┴─────┬─────┘
     │                │               │        │          │
     ▼                │               │        │          │
┌──────────────────┐  │               │        │          │
│ BACKEND CONTAINER│  │               │        │          │
│  Hono + Node 20  │──┴───────────────┴────────┴──────────┘
│  (Port 8000)     │
└────┬─────────────┘
     │
     ├─────────────────────────┬──────────────────────┐
     ▼                         ▼                      ▼
┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐
│  PostgreSQL 16   │  │  Redis 7         │  │  Worker Service  │
│  (Port 5432)     │  │  (Port 6379)     │  │  BullMQ Consumer │
│                  │  │                  │  │  (No exposed)    │
│  - Events        │  │  - Sessions      │  │  - Email jobs    │
│  - Users         │  │  - Job queue     │  │  - Integrations  │
│  - Calendars     │  │  - Rate limits   │  │  - Async work    │
└──────────────────┘  └──────────────────┘  └──────────────────┘
```

## Development Pipeline (14 Phases)

### Phase 0: Foundation ✅ (Current)
- [x] Project scaffold (monorepo, workspaces)
- [x] Docker Compose setup (local dev)
- [x] Environment configuration
- [x] Base types and schemas
- [x] Backend scaffolding (Hono app)
- [x] Frontend scaffolding (React + Vite)
- [x] Dockerfiles (multi-stage builds)
- [x] GitHub Actions CI/CD pipelines

**Status:** Complete
**Duration:** Week 1

### Phase 1: Authentication & Authorization
- User registration and login
- JWT token management (7-day expiry)
- Password hashing (Argon2id)
- Role-based access control (RBAC)
- Session management (Redis)

**Estimated:** Week 2-3

### Phase 2: Calendar Management
- CRUD operations for calendars
- Calendar sharing with granular permissions
- Calendar colors and metadata
- Bulk calendar operations
- Calendar subscriptions (read-only)

**Estimated:** Week 4-5

### Phase 3: Event Management
- CRUD for events (create, read, update, delete)
- Event scheduling with date/time validation
- Recurring events (daily, weekly, monthly)
- Event reminders and notifications
- Event attendance tracking

**Estimated:** Week 6-7

### Phase 4: Integration Framework
- Google Calendar OAuth + sync
- Microsoft Outlook integration
- Slack notifications
- Webhook support (incoming + outgoing)
- Calendar feed (iCal, Atom)

**Estimated:** Week 8-10

### Phase 5: Advanced Features
- AI scheduling suggestions (OpenAI)
- Conflict detection
- Availability analysis
- Smart resource allocation
- Time zone handling (user-specific)

**Estimated:** Week 11-12

### Phase 6: Deployment & Scaling
- Production Dockerfile optimization ✅
- Kubernetes manifests (k3s)
- CI/CD pipeline (GitHub Actions) ✅
- Monitoring (Prometheus, Grafana)
- Alerting (email, Slack)

**Estimated:** Week 13-14

### Phase 7-14: Polish & Operations
- Performance optimization (caching, indexing)
- Security hardening (rate limiting, CORS)
- Compliance (GDPR, audit logging)
- User documentation
- Admin dashboard
- Mobile app (React Native)
- Load testing & benchmarking

**Estimated:** Week 15+

## Technology Stack

### Backend (Node.js + TypeScript)

| Layer | Technology | Version | Purpose |
|-------|-----------|---------|---------|
| Framework | Hono | 4.3+ | Lightweight REST API |
| ORM | Drizzle | 0.30+ | Type-safe database queries |
| Database | PostgreSQL | 16 | Relational data |
| Cache | Redis | 7 | Session & job queue |
| Queue | BullMQ | 5.7+ | Background jobs |
| Auth | Jose + Argon2 | 5.2+ + 0.31+ | JWT + password hashing |
| Validation | Zod | 3.22+ | Runtime type checking |
| Logging | Pino | 9.1+ | Structured JSON logs |

### Frontend (React + TypeScript)

| Layer | Technology | Version | Purpose |
|-------|-----------|---------|---------|
| UI Framework | React | 18.3+ | Component library |
| Build Tool | Vite | 6.0+ | 10x faster builds |
| Routing | TanStack Router | 1.114+ | Type-safe routes |
| State (Server) | React Query | 5.66+ | Server state management |
| State (Client) | Zustand | 5.0+ | Lightweight client state |
| Forms | React Hook Form | 7.54+ | Efficient form handling |
| CSS | Tailwind | 3.4+ | Utility-first CSS |
| Components | Radix UI | Latest | Accessible headless UI |

### Infrastructure

| Component | Version | Purpose |
|-----------|---------|---------|
| Container Runtime | Docker | 24.0+ | Containerization |
| Orchestration | Docker Compose | 2.20+ | Multi-container (dev/prod) |
| Reverse Proxy | Traefik | 2.10+ | TLS, routing, load balancing |
| DNS/DDoS | Cloudflare | Latest | DNS, SSL, DDoS protection |
| CI/CD | GitHub Actions | Native | Automated testing & deployment |

## Design Principles

### 1. Type Safety
- **TypeScript** strict mode everywhere
- **Shared schemas** between frontend and backend (Zod)
- **Database types** from ORM (Drizzle)
- **API contracts** typed both sides

### 2. Security First
- **JWT** for authentication (7-day expiry)
- **Argon2id** for password hashing (OWASP standard)
- **HTTPS only** in production (Traefik + Cloudflare)
- **Input validation** on all routes (Zod)
- **CORS & CSRF** protection enabled
- **SQL injection** impossible (ORM + parameterized queries)
- **Multi-tenancy** enforced at query level (tenant_id filter)

### 3. Multi-Tenancy
- **Workspace** is the tenant boundary
- **Row-level isolation** via tenant_id in all tables
- **Users isolated** to their workspace
- **Data access** always scoped to current tenant
- **Future:** PostgreSQL RLS policies (Phase 4)

### 4. Scalability
- **Horizontal scaling** via multiple workers (BullMQ)
- **Connection pooling** (pg)
- **Caching** (Redis for sessions, tokens, rate limits)
- **Database indexes** on foreign keys (tenant_id, user_id, etc.)
- **Async processing** for long-running tasks

### 5. Developer Experience
- **Monorepo** with shared code
- **Npm workspaces** for dependency management
- **Docker Compose** for instant local dev
- **Hot reload** (Vite frontend, tsx backend)
- **Single make command** for common tasks
- **Type-safe database queries** (no string SQL)

## Multi-Tenancy Strategy

### Data Isolation

Every table includes `workspace_id` (or `tenant_id`):

```sql
CREATE TABLE users (
  id UUID PRIMARY KEY,
  email VARCHAR(255) NOT NULL,
  workspace_id UUID NOT NULL REFERENCES workspaces(id),
  UNIQUE(email, workspace_id)  -- Email unique per tenant only
);
```

Every query filters by current tenant:

```typescript
const users = await db.query.users.findMany({
  where: eq(schema.users.workspaceId, currentWorkspaceId),
});
```

### Tenant Identification

From JWT claims (extracted in middleware):

```typescript
const payload = await verifyJWT(token);
const { sub: userId, workspace_id: workspaceId } = payload;

// Inject into request context
ctx.user = { id: userId, workspaceId };
```

## Deployment

### Local Development

```bash
make up          # Start all services
make migrate     # Run migrations
make logs        # View logs
```

All services run in Docker, connected via `agendaflow-internal` network.

### Production

See [DEPLOY.md](../DEPLOY.md) for complete deployment guide:
- VPS setup with Traefik
- Docker image building
- GitHub Actions CI/CD
- SSL/TLS with Cloudflare
- Health monitoring
- Backup & recovery

## Health Checks

### Liveness (is the service running?)

```bash
curl http://localhost:8000/healthz
# → {"status":"ok","uptime":"123.45s"}
```

### Readiness (are dependencies healthy?)

```bash
curl http://localhost:8000/readyz
# → {"status":"ok","database":"healthy","redis":"healthy"}
```

## Monitoring & Logging

### Structured Logs

All logs use Pino JSON format:

```json
{
  "timestamp": "2024-06-11T12:34:56.789Z",
  "level": "info",
  "userId": "abc123",
  "workspaceId": "def456",
  "method": "POST",
  "path": "/v1/events",
  "status": 201,
  "duration": 45,
  "message": "Event created"
}
```

### Metrics

Available at `/metrics` (admin IP whitelist):

```
http_requests_total{method="POST",path="/v1/events",status="201"} 1234
http_request_duration_seconds{endpoint="/v1/events"} 0.045
database_connections{state="active"} 5
```

## Code Quality

### Testing

- **Unit tests** for business logic
- **Integration tests** for API routes
- **E2E tests** for critical flows (Playwright)
- **Coverage target:** 60%+ overall

### Linting & Formatting

- **ESLint** enforces code standards
- **Prettier** auto-formats code
- **TypeScript** strict mode (no `any`)
- **Pre-commit hooks** run before git commit

## See Also

- [MULTI_TENANCY.md](./MULTI_TENANCY.md) — Data isolation details
- [../CLAUDE.md](../CLAUDE.md) — Non-negotiable architectural rules
- [../DEPLOY.md](../DEPLOY.md) — Production deployment guide
- [../README.md](../README.md) — Quick start & user guide
