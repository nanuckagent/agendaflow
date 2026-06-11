# AgendaFlow Backend Implementation Guide

Complete implementation of AgendaFlow backend with all required features.

## What's Implemented

### Core Infrastructure ✅
- [x] **Node.js 20 + Hono** — Lightweight, fast HTTP framework
- [x] **Drizzle ORM + PostgreSQL** — Type-safe database layer
- [x] **Redis** — Caching and job queue support
- [x] **BullMQ** — Background job processor
- [x] **Pino + Pino-HTTP** — Structured logging
- [x] **Zod** — Runtime type validation

### Authentication ✅
- [x] **JWT tokens** — 15-minute access tokens
- [x] **Refresh tokens** — 7-day refresh tokens with rotation
- [x] **Argon2id hashing** — Secure password hashing
- [x] **Google OAuth integration** — OAuth 2.0 flow
- [x] **HttpOnly cookies** — Secure token storage
- [x] **CORS middleware** — Cross-origin request handling

### Database Schema ✅
- [x] **Multi-tenancy** — All tables have `workspaceId` FK
- [x] **Workspaces** — Tenant isolation with custom branding
- [x] **Users** — Role-based access (admin, manager, member, professional)
- [x] **Appointments** — Status tracking (pending, confirmed, cancelled, completed)
- [x] **Professionals** — Professional profiles with specialties and ratings
- [x] **Services** — Business services with pricing and duration
- [x] **Payments** — Payment records with MercadoPago integration
- [x] **Refresh Tokens** — Token management with revocation
- [x] **Audit Logs** — Compliance tracking for all changes

### Encryption & Security ✅
- [x] **AES-256-GCM encryption** — PII encryption (phones, emails)
- [x] **SHA-256 hashing** — Privacy-preserving lookups
- [x] **Random token generation** — Secure reference codes
- [x] **RFC 7807 errors** — Problem Details format
- [x] **SameSite=Strict cookies** — CSRF protection

### Services ✅
- [x] **AuthService** — Token generation, verification, rotation
- [x] **WorkspaceService** — Workspace CRUD, slug generation
- [x] **AppointmentService** — Booking, availability calculation, cancellation
- [x] **ProfessionalService** — Professional management
- [x] **ServiceService** — Business service management
- [x] **PaymentService** — Payment processing, webhooks
- [x] **AuditService** — Audit logging

### API Endpoints ✅
- [x] **Health checks** — `/healthz`, `/readyz`
- [x] **Authentication** — Login, refresh, logout, Google OAuth
- [x] **Public bookings** — No auth required for appointment booking
- [x] **Admin appointments** — Full CRUD with status management
- [x] **Workspace management** — Create, read, update workspaces
- [x] **Payment webhooks** — MercadoPago integration
- [x] **Availability slots** — Calculate free time slots

### Middleware ✅
- [x] **JWT authentication** — Token verification
- [x] **Workspace isolation** — Data isolation per workspace
- [x] **Error handling** — Global error handler with RFC 7807 format
- [x] **CORS** — Cross-origin request handling
- [x] **Logging** — Request/response logging

### Worker Process ✅
- [x] **BullMQ integration** — Background job processing
- [x] **SMS queue** — Twilio SMS notifications
- [x] **Email queue** — Email notifications
- [x] **Webhook queue** — Webhook delivery

### Tools & Utilities ✅
- [x] **Crypto utilities** — Encryption, hashing, token generation
- [x] **Validation schemas** — Zod schemas for all inputs
- [x] **Logger utilities** — Structured logging helpers
- [x] **Database utilities** — Connection pooling, migrations

## File Structure

```
src/backend/
├── src/
│   ├── index.ts                          # Entry point (API or worker)
│   ├── app.ts                            # Hono app factory
│   ├── env.ts                            # Environment validation
│   ├── config/
│   │   ├── db.ts                         # Database config
│   │   └── redis.ts                      # Redis config
│   ├── db/
│   │   ├── index.ts                      # DB instance
│   │   ├── seed.ts                       # Data seeding
│   │   └── schema/
│   │       └── index.ts                  # Table definitions
│   ├── lib/
│   │   ├── crypto.ts                     # Encryption utilities
│   │   ├── logger.ts                     # Logging helpers
│   │   ├── redis.ts                      # Redis helpers
│   │   └── validation.ts                 # Zod schemas
│   ├── middlewares/
│   │   ├── auth.ts                       # JWT auth
│   │   └── workspace.ts                  # Workspace isolation
│   ├── routes/
│   │   ├── index.ts                      # Route registration
│   │   ├── health.ts                     # Health checks
│   │   ├── auth/
│   │   │   ├── oauth-google.ts           # Google OAuth
│   │   │   └── login.ts                  # Email/password login
│   │   ├── appointments/
│   │   │   ├── public.ts                 # Public booking
│   │   │   └── admin.ts                  # Admin CRUD
│   │   ├── workspaces/
│   │   │   └── index.ts                  # Workspace CRUD
│   │   └── payment/
│   │       └── mercadopago.ts            # Payment processing
│   ├── services/
│   │   ├── auth.service.ts               # Authentication logic
│   │   ├── workspace.service.ts          # Workspace logic
│   │   ├── appointment.service.ts        # Appointment logic
│   │   ├── professional.service.ts       # Professional logic
│   │   ├── service.service.ts            # Service logic
│   │   ├── payment.service.ts            # Payment logic
│   │   └── audit.service.ts              # Audit logging
│   └── worker/
│       └── index.ts                      # Background worker
├── .env.example                          # Environment template
├── package.json                          # Dependencies
├── tsconfig.json                         # TypeScript config
├── tsconfig.build.json                   # Build config
├── README.md                             # Setup guide
└── IMPLEMENTATION.md                     # This file
```

## Quick Start

### 1. Install Dependencies
```bash
cd src/backend
npm install
```

### 2. Configure Environment
```bash
cp .env.example .env
# Edit .env with your values
```

### 3. Set Up Database
```bash
npm run db:migrate
npm run seed
```

### 4. Start Development Server
```bash
npm run dev
```

Server runs on `http://127.0.0.1:8000`

### 5. Test Health Checks
```bash
curl http://127.0.0.1:8000/healthz
curl http://127.0.0.1:8000/readyz
```

## Integration Checklist

### Before Going to Production

- [ ] Set unique `JWT_SECRET` (32+ chars)
- [ ] Set unique `SESSION_SECRET` (32+ chars)
- [ ] Configure PostgreSQL with SSL
- [ ] Configure Redis authentication
- [ ] Set `NODE_ENV=production`
- [ ] Configure Google OAuth credentials
- [ ] Configure Twilio API keys
- [ ] Configure MercadoPago access token
- [ ] Set up Sentry for error tracking
- [ ] Enable request rate limiting
- [ ] Configure CORS origin whitelist
- [ ] Test all payment flows
- [ ] Test SMS notifications
- [ ] Set up monitoring/alerts
- [ ] Configure CI/CD pipeline

### Testing Endpoints

#### Create Workspace (requires login)
```bash
curl -X POST http://localhost:8000/v1/workspaces \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "My Salon",
    "timezone": "America/Sao_Paulo",
    "currency": "BRL"
  }'
```

#### Book Appointment (public)
```bash
curl -X POST http://localhost:8000/v1/appointments/book \
  -H "X-Workspace-Id: $WORKSPACE_ID" \
  -H "Content-Type: application/json" \
  -d '{
    "clientName": "João Silva",
    "clientPhone": "+5511999999999",
    "clientEmail": "joao@example.com",
    "professionalId": "prof-id",
    "serviceId": "service-id",
    "appointmentDate": "2024-12-25T14:00:00Z",
    "appointmentTime": "14:00"
  }'
```

#### Get Available Slots (admin)
```bash
curl http://localhost:8000/v1/appointments/slots/prof-id \
  -H "Authorization: Bearer $TOKEN" \
  -H "X-Workspace-Id: $WORKSPACE_ID" \
  -G \
  -d "startDate=2024-12-20" \
  -d "endDate=2024-12-31"
```

## Environment Variables Reference

| Variable | Required | Default | Purpose |
|----------|----------|---------|---------|
| `NODE_ENV` | No | development | Node environment |
| `APP_ROLE` | No | api | api or worker |
| `PORT` | No | 8000 | HTTP port |
| `DATABASE_URL` | Yes | - | PostgreSQL URL |
| `REDIS_URL` | Yes | - | Redis URL |
| `JWT_SECRET` | Yes | - | JWT signing key |
| `JWT_EXPIRES_IN` | No | 15m | Access token expiry |
| `JWT_REFRESH_EXPIRES_IN` | No | 7d | Refresh token expiry |
| `SESSION_SECRET` | Yes | - | Session key |
| `LOG_LEVEL` | No | info | debug/info/warn/error |
| `LOG_FORMAT` | No | json | json or pretty |
| `GOOGLE_CLIENT_ID` | No | - | Google OAuth client ID |
| `GOOGLE_CLIENT_SECRET` | No | - | Google OAuth secret |
| `GOOGLE_CALLBACK_URL` | No | - | OAuth callback URL |
| `TWILIO_ACCOUNT_SID` | No | - | Twilio account SID |
| `TWILIO_AUTH_TOKEN` | No | - | Twilio auth token |
| `TWILIO_PHONE_NUMBER` | No | - | Twilio phone number |
| `MERCADOPAGO_ACCESS_TOKEN` | No | - | MercadoPago token |
| `SENTRY_DSN` | No | - | Sentry error tracking |
| `API_URL` | No | http://localhost:8000 | API base URL |
| `FRONTEND_URL` | No | - | Frontend origin for CORS |

## Data Model Examples

### Workspace Structure
```json
{
  "id": "uuid",
  "slug": "my-salon-abc123",
  "name": "My Salon",
  "ownerUserId": "uuid",
  "timezone": "America/Sao_Paulo",
  "currency": "BRL",
  "primaryColor": "#3b5bdb",
  "sidebarColor": "#1a2d7a",
  "accentColor": "#0066cc",
  "logoUrl": "https://...",
  "createdAt": "2024-01-01T00:00:00Z",
  "updatedAt": "2024-01-01T00:00:00Z"
}
```

### User Structure
```json
{
  "id": "uuid",
  "email": "user@example.com",
  "emailHash": "sha256hash",
  "firstName": "João",
  "lastName": "Silva",
  "workspaceId": "uuid",
  "role": "admin",
  "active": true,
  "lastLoginAt": "2024-01-15T10:30:00Z",
  "createdAt": "2024-01-01T00:00:00Z"
}
```

### Appointment Structure
```json
{
  "id": "uuid",
  "code": "ABCD1234",
  "workspaceId": "uuid",
  "clientName": "João Silva",
  "clientPhoneEnc": "encrypted",
  "clientEmailEnc": "encrypted",
  "professionalId": "uuid",
  "serviceId": "uuid",
  "appointmentDate": "2024-12-25T14:00:00Z",
  "appointmentTime": "14:00",
  "durationMinutes": 60,
  "status": "confirmed",
  "notes": "First time customer",
  "createdAt": "2024-01-15T10:30:00Z"
}
```

## Common Tasks

### Add a New Endpoint

1. Create route handler in `src/routes/newfeature/index.ts`
2. Add validation schema in `src/lib/validation.ts`
3. Register route in `src/routes/index.ts`
4. Add service logic in `src/services/newfeature.service.ts`

### Add Background Job

1. Define job in `src/worker/index.ts`
2. Queue job from route handler
3. Define job handler in worker
4. Test with `APP_ROLE=worker npm run dev`

### Database Schema Change

1. Update schema in `src/db/schema/index.ts`
2. Run `npm run db:generate` (creates migration)
3. Run `npm run db:migrate` (applies migration)
4. Update services if needed

### Add Validation

1. Create Zod schema in `src/lib/validation.ts`
2. Use `safeParse()` in route handler
3. Return validation error response

## Performance Optimization

### Database
- Connection pooling (10 connections max)
- Indexes on frequently queried columns
- Query logging in development only

### Redis
- Session storage
- Job queue
- Rate limiting cache

### Caching
- Browser caching headers
- Redis caching for queries
- JWT token caching in Redis

## Security Best Practices

1. ✅ Use HTTPS in production
2. ✅ Rotate JWT_SECRET and SESSION_SECRET regularly
3. ✅ Enable SameSite=Strict on cookies
4. ✅ Implement rate limiting
5. ✅ Validate all inputs with Zod
6. ✅ Encrypt PII with AES-256-GCM
7. ✅ Hash sensitive data with SHA-256
8. ✅ Use Argon2id for passwords
9. ✅ Log security events to audit logs
10. ✅ Monitor for suspicious activity

## Monitoring & Debugging

### Logs
```bash
# Development
npm run dev  # Pretty-printed logs

# Production
NODE_ENV=production npm start  # JSON logs
```

### Database
```bash
# GUI
npm run db:studio

# Migrations
npm run db:migrate
npm run db:generate
```

### Type Checking
```bash
npm run typecheck  # Find type errors
```

### Linting
```bash
npm run lint  # Code quality checks
```

## Deployment

### Docker
See `Dockerfile` for containerization.

### Environment
```bash
export NODE_ENV=production
export APP_ROLE=api  # or worker
export DATABASE_URL=...
export REDIS_URL=...
```

### Health Checks
```bash
# Kubernetes liveness probe
curl http://localhost:8000/healthz

# Kubernetes readiness probe
curl http://localhost:8000/readyz
```

## Support & Next Steps

- Run `npm run test` to add unit tests
- Run `npm run typecheck` to verify types
- Check `CLAUDE.md` for architecture decisions
- Review `saas-barbearia` for patterns

## Advanced Features (Future)

- [ ] WebSocket support for real-time updates
- [ ] GraphQL API alongside REST
- [ ] Advanced analytics and reporting
- [ ] Multi-language support
- [ ] Custom branding templates
- [ ] Appointment reminders (SMS + email)
- [ ] Team collaboration features
- [ ] Integration with calendar systems
- [ ] Subscription billing
- [ ] Marketing automation
