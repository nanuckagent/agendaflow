# Multi-Tenancy Architecture

## Overview

AgendaFlow is designed as a multi-tenant SaaS platform. Each organization (tenant) has its own:
- Users
- Calendars
- Events
- Configurations

## Database Design

### Tenant Isolation

All tables include a `tenant_id` field for data isolation:

```sql
CREATE TABLE events (
  id UUID PRIMARY KEY,
  calendar_id UUID NOT NULL,
  tenant_id UUID NOT NULL,  -- Isolation key
  title VARCHAR(255) NOT NULL,
  ...
);

CREATE INDEX idx_events_tenant ON events(tenant_id);
```

### Row-Level Security (RLS)

Future Phase: PostgreSQL RLS policies will enforce data isolation at the database level:

```sql
ALTER TABLE events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenants can only access their own events"
  ON events
  USING (tenant_id = current_setting('app.current_tenant_id')::uuid);
```

## API Design

### Tenant Identification

Each request must include the tenant context:

**Via JWT Claims:**
```json
{
  "sub": "user-id",
  "tenant_id": "tenant-uuid",
  "role": "admin"
}
```

**Via Header (fallback):**
```bash
curl -H "X-Tenant-ID: tenant-uuid" https://api.agendaflow.local/v1/calendars
```

### Query Filtering

All queries automatically filter by `tenant_id`:

```typescript
// Backend
const events = await db.query.events
  .findMany({
    where: eq(schema.events.tenantId, tenantId),
  });
```

## Multi-Tenancy Scenarios

### Self-Hosted (Single Tenant)
- One organization per deployment
- `tenant_id` is fixed/hardcoded
- Simpler configuration

### SaaS (Multiple Tenants)
- Multiple organizations share infrastructure
- Tenant context extracted from JWT or subdomain
- Resource quotas and billing per tenant

## Security Considerations

1. **Data Isolation:** Every query filters by `tenant_id`
2. **JWT Validation:** Tenant ID verified against token
3. **Rate Limiting:** Per-tenant limits to prevent resource exhaustion
4. **Audit Logging:** All changes logged with `tenant_id`
5. **Backup/Recovery:** Snapshots are tenant-aware

## Future Enhancements

- PostgreSQL Row-Level Security (Phase 4)
- Tenant-specific custom fields
- Tenant quota management
- Tenant lifecycle events (create, suspend, delete)
