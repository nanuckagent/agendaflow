# AgendaFlow Backend

Node.js 20 + Hono + Drizzle ORM + PostgreSQL + Redis backend for AgendaFlow appointment scheduling platform.

## Architecture

### Multi-Tenancy
All tables include `workspaceId` foreign key for complete data isolation per workspace.

### Services
- **AuthService** — JWT token generation, password hashing (Argon2id), refresh token rotation
- **WorkspaceService** — Workspace CRUD, auto-generated slugs, branding customization
- **AppointmentService** — Availability calculation, booking, confirmation, cancellation
- **ProfessionalService** — Professional profiles and management
- **ServiceService** — Business services (haircut, massage, etc.)
- **PaymentService** — Payment records and MercadoPago integration
- **AuditService** — Compliance logging for all changes

### Encryption
- **PII Encryption** — Client phones and emails encrypted with AES-256-GCM
- **Hashing** — Phone and email hashing for privacy-preserving lookups

## Setup

### Prerequisites
- Node.js 20+
- PostgreSQL 14+
- Redis 6+

### Installation

```bash
# Install dependencies
npm install

# Create .env file from example
cp .env.example .env

# Update .env with your values
```

### Environment Variables

See `.env.example` for all available options.

**Critical variables:**
- `DATABASE_URL` — PostgreSQL connection string
- `REDIS_URL` — Redis connection string
- `JWT_SECRET` — Change in production
- `SESSION_SECRET` — Change in production

## Database

### Migrations

```bash
# Generate migration
npm run db:generate

# Apply migrations
npm run db:migrate

# Start Drizzle Studio (GUI)
npm run db:studio
```

### Seeding

```bash
npm run seed
```

## Running

### Development

```bash
npm run dev
```

API starts on `http://127.0.0.1:8000`

### Production Build

```bash
npm run build
npm start
```

### Background Worker

```bash
APP_ROLE=worker npm start
```

Processes BullMQ jobs for SMS, emails, webhooks.

## API Endpoints

### Health Checks
- `GET /healthz` — Liveness probe
- `GET /readyz` — Readiness probe (checks DB + Redis)

### Authentication
- `POST /v1/auth/google` — Google OAuth redirect
- `GET /v1/auth/google/callback` — OAuth callback
- `POST /v1/auth/login` — Email/password login
- `POST /v1/auth/refresh` — Refresh access token
- `POST /v1/auth/logout` — Logout and revoke tokens

### Appointments (Public)
- `POST /v1/appointments/book` — Book appointment (no auth)
- `GET /v1/appointments/:code` — Get appointment by code (no auth)
- `POST /v1/appointments/:code/cancel` — Cancel with token (no auth)

### Appointments (Admin)
- `GET /v1/appointments` — List appointments
- `GET /v1/appointments/:id` — Get appointment details
- `PATCH /v1/appointments/:id/confirm` — Confirm appointment
- `PATCH /v1/appointments/:id/cancel` — Cancel appointment
- `GET /v1/appointments/slots/:professionalId` — Available slots

### Workspaces
- `POST /v1/workspaces` — Create workspace
- `GET /v1/workspaces/:id` — Get workspace
- `PATCH /v1/workspaces/:id` — Update workspace branding
- `GET /v1/user/workspaces` — List user's workspaces

## JWT Tokens

### Access Token (15m)
```json
{
  "userId": "...",
  "workspaceId": "...",
  "email": "user@example.com",
  "role": "admin|manager|member|professional",
  "iat": 1234567890,
  "exp": 1234568890
}
```

### Refresh Token (7d)
Stored in database as httpOnly cookie. Auto-rotates on use.

## Error Handling

All errors follow RFC 7807 Problem Details format:

```json
{
  "type": "https://agendaflow.local/errors/validation-error",
  "title": "Validation Error",
  "status": 422,
  "detail": "One or more validation errors occurred",
  "errors": [
    {
      "path": "clientPhone",
      "message": "Invalid phone number",
      "code": "invalid_string"
    }
  ]
}
```

## Encryption & Security

### PII Encryption
Sensitive fields like `clientPhone` and `clientEmail` are encrypted per workspace:

```typescript
const encrypted = encryptPII(phoneNumber, workspaceId);
const decrypted = decryptPII(encrypted, workspaceId);
```

### Phone/Email Hashing
For privacy-preserving lookups:

```typescript
const phoneHash = hashPhone(phoneNumber); // SHA-256
const emailHash = hashEmail(email); // SHA-256
```

### Passwords
Argon2id with secure defaults (19456 memory cost, 2 time cost).

## Testing

```bash
npm run test
npm run test:coverage
```

## Linting & Type Checking

```bash
npm run lint
npm run typecheck
```

## Background Jobs

Via BullMQ + Redis:

- **SMS Queue** — Send SMS via Twilio
- **Email Queue** — Send confirmation/cancellation emails
- **Webhook Queue** — Send MercadoPago webhooks

Example: Send SMS on appointment confirmation

```typescript
await smsQueue.add('send-sms', {
  to: '+5511999999999',
  message: 'Your appointment is confirmed!'
});
```

## Integration Examples

### Google OAuth

```typescript
// User clicks "Sign in with Google"
// -> Redirect to GET /v1/auth/google
// -> User authorizes
// -> Redirects to GET /v1/auth/google/callback?code=...
// -> Exchange code for JWT
// -> Set httpOnly cookies
// -> Redirect to frontend dashboard
```

### MercadoPago Payment

```typescript
// 1. Create payment preference
const preference = await createMercadopagoPreference({
  appointmentId: '...',
  amount: 19900, // R$ 199.00
});

// 2. Redirect client to preference URL
// 3. MercadoPago sends webhook to /v1/payments/mercadopago/webhook
// 4. Update payment status
// 5. If approved, confirm appointment
```

### Twilio SMS

```typescript
// Schedule SMS on appointment confirmation
await smsQueue.add('send-sms', {
  to: clientPhone,
  message: `Appointment confirmed for ${date} at ${time}`,
});
```

## Deployment

### Docker

```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY . .
RUN npm ci --omit=dev
RUN npm run build
CMD ["npm", "start"]
```

### Environment
```bash
NODE_ENV=production
APP_ROLE=api  # or "worker"
```

### Health Checks
```bash
# Startup probe
curl http://localhost:8000/healthz

# Readiness probe
curl http://localhost:8000/readyz
```

## Monitoring

### Sentry Integration (optional)
Set `SENTRY_DSN` to enable error tracking.

### Logging
- Development: Pretty-printed JSON (pino-pretty)
- Production: Structured JSON (logstash compatible)

Log level: `debug|info|warn|error` (controlled by `LOG_LEVEL`)

## Development Workflow

1. Create/update database schema in `src/db/schema/`
2. Generate migration: `npm run db:generate`
3. Apply migration: `npm run db:migrate`
4. Add service in `src/services/`
5. Create/update routes in `src/routes/`
6. Test with `npm run dev` and `curl` or Insomnia
7. Type-check: `npm run typecheck`
8. Build: `npm run build`

## File Structure

```
src/
├── index.ts              # Entry point (API or worker)
├── app.ts                # Hono app factory with middleware
├── env.ts                # Environment validation
├── config/
│   ├── db.ts             # Database connection
│   └── redis.ts          # Redis connection
├── db/
│   ├── index.ts          # Database instance
│   ├── seed.ts           # Database seeding
│   └── schema/
│       └── index.ts      # Drizzle schema definitions
├── lib/
│   ├── crypto.ts         # Encryption/hashing utilities
│   ├── validation.ts     # Zod schemas and validation
│   └── logger.ts         # Logging helpers
├── middlewares/
│   ├── auth.ts           # JWT authentication
│   └── workspace.ts      # Workspace isolation
├── routes/
│   ├── index.ts          # Route registration
│   ├── health.ts         # Health checks
│   ├── auth/
│   │   ├── oauth-google.ts
│   │   └── login.ts
│   ├── appointments/
│   │   ├── public.ts
│   │   └── admin.ts
│   └── payment/
│       └── mercadopago.ts
├── services/
│   ├── auth.service.ts
│   ├── workspace.service.ts
│   ├── appointment.service.ts
│   ├── professional.service.ts
│   ├── service.service.ts
│   ├── payment.service.ts
│   └── audit.service.ts
└── worker/
    └── index.ts          # Background job processor
```

## Next Steps

1. Implement remaining route handlers (workspaces, professionals, services)
2. Add integration tests
3. Set up CI/CD pipeline
4. Configure Sentry error tracking
5. Implement rate limiting
6. Add API documentation (OpenAPI/Swagger)
