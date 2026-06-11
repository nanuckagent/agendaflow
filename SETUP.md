# AgendaFlow — VPS Setup & Deployment Guide

## Prerequisites

- Ubuntu 22.04 LTS on VPS
- Docker + Docker Compose v2.20+
- Traefik running with `proxy` network and Cloudflare DNS resolver
- GitHub CLI or SSH key for deployments

## Step 1: Clone Repository & Setup Directory

```bash
# SSH into VPS as root
ssh root@nanuck.com.br

# Create deployment directory
mkdir -p /opt/agendaflow
cd /opt/agendaflow

# Clone repository
git clone https://github.com/nanuckagent/agendaflow.git .
```

## Step 2: Configure Environment Variables

```bash
# Copy example file
cp .env.example .env.production

# Edit with production values
nano .env.production
```

**Required values in .env.production:**

```bash
# Database
POSTGRES_DB=agendaflow_prod
POSTGRES_USER=agendaflow
POSTGRES_PASSWORD=<generate-strong-password>

# Redis
REDIS_PASSWORD=<generate-strong-password>

# JWT
JWT_SECRET=<generate-strong-secret-256-bit>

# Google OAuth (get from Google Cloud Console)
GOOGLE_CLIENT_ID=<your-client-id>
GOOGLE_CLIENT_SECRET=<your-client-secret>
GOOGLE_REDIRECT_URI=https://agendaflow.nanuck.com.br/v1/auth/google/callback

# Twilio (optional for notifications)
TWILIO_ACCOUNT_SID=<your-account-sid>
TWILIO_AUTH_TOKEN=<your-auth-token>
TWILIO_PHONE_NUMBER=+5511999999999

# MercadoPago (optional for payments)
MERCADOPAGO_ACCESS_TOKEN=<your-access-token>

# Monitoring
SENTRY_DSN=<optional>

# App config
NODE_ENV=production
APP_VERSION=1.0.0
```

### Generate Secure Passwords

```bash
# Generate JWT_SECRET (base64 256-bit random)
openssl rand -base64 32

# Generate POSTGRES_PASSWORD
openssl rand -base64 24

# Generate REDIS_PASSWORD
openssl rand -base64 24
```

## Step 3: Create Traefik Entry Point (if not exists)

Ensure Traefik is running with Cloudflare DNS challenge:

```bash
# Verify Traefik is running
docker ps | grep traefik

# Check proxy network exists
docker network ls | grep proxy

# If Traefik not running, ensure these env vars are set:
export CF_DNS_API_TOKEN=<your-cloudflare-api-token>
export CF_ZONE_API_TOKEN=<your-cloudflare-zone-api-token>

# Start Traefik (example, adjust if needed)
docker compose -f /opt/traefik/docker-compose.yml up -d
```

## Step 4: Deploy AgendaFlow Services

```bash
# Navigate to project directory
cd /opt/agendaflow

# Build Docker images (or pull from GHCR)
docker compose -f infra/docker-compose.prod.yml build

# Or pull pre-built images from GitHub Container Registry:
docker login ghcr.io -u <username> -p <github-token>
docker compose -f infra/docker-compose.prod.yml pull

# Start services
docker compose -f infra/docker-compose.prod.yml up -d

# Verify all services are healthy
docker compose -f infra/docker-compose.prod.yml ps
```

## Step 5: Run Database Migrations

```bash
# Run Drizzle migrations
docker compose -f infra/docker-compose.prod.yml exec backend npm run migrate

# Seed initial data (optional)
docker compose -f infra/docker-compose.prod.yml exec backend npm run seed
```

## Step 6: Verify Deployment

### Health Checks

```bash
# Check API health
curl -s https://agendaflow.nanuck.com.br/healthz | jq .

# Expected response:
# {
#   "status": "ok",
#   "timestamp": "2026-06-11T20:00:00Z"
# }

# Check readiness
curl -s https://agendaflow.nanuck.com.br/readyz | jq .
```

### Test Endpoints

```bash
# Test Google OAuth redirect
curl -s -L https://agendaflow.nanuck.com.br/v1/auth/google | head -20

# Check frontend is serving
curl -s https://agendaflow.nanuck.com.br/ | head -50

# Verify Traefik routing
curl -s -I https://agendaflow.nanuck.com.br/ | grep -E 'HTTP|Server'
```

## Step 7: Configure DNS & SSL

Ensure DNS A record points to VPS:

```bash
# In Cloudflare DNS:
# Type: A
# Name: agendaflow
# Value: <VPS-IP>
# Proxy: DNS only (or orange cloud)
# TTL: Auto

# Verify DNS resolution
dig agendaflow.nanuck.com.br

# Traefik will auto-generate SSL via Let's Encrypt + Cloudflare DNS challenge
```

## Step 8: Setup Automatic Backups

```bash
# Create backup script
cat > /opt/agendaflow/infra/scripts/backup.sh << 'EOF'
#!/bin/bash
BACKUP_DIR="/opt/agendaflow/backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
DB_NAME="agendaflow_prod"
DB_USER="agendaflow"

mkdir -p $BACKUP_DIR

# Backup database
docker compose -f infra/docker-compose.prod.yml exec -T db \
  pg_dump -U $DB_USER $DB_NAME | gzip > $BACKUP_DIR/db_$TIMESTAMP.sql.gz

# Keep only last 7 days of backups
find $BACKUP_DIR -name "db_*.sql.gz" -mtime +7 -delete

echo "Backup completed: $BACKUP_DIR/db_$TIMESTAMP.sql.gz"
EOF

chmod +x /opt/agendaflow/infra/scripts/backup.sh

# Add to crontab (daily at 2 AM)
echo "0 2 * * * /opt/agendaflow/infra/scripts/backup.sh" | crontab -
```

## Step 9: Setup Monitoring & Alerts

```bash
# View logs in real-time
docker compose -f infra/docker-compose.prod.yml logs -f backend worker frontend

# Monitor container resource usage
docker stats

# Check Traefik dashboard (if enabled)
# Usually at https://agendaflow.nanuck.com.br/dashboard/
```

## Step 10: CI/CD Integration

GitHub Actions will automatically build and deploy on push to main:

```yaml
# .github/workflows/deploy.yml handles:
# 1. npm test (run tests)
# 2. npm build (build all packages)
# 3. docker build & push to ghcr.io
# 4. SSH to VPS and run:
#    - git pull
#    - docker compose pull
#    - docker compose up -d
#    - npm run migrate
```

**Setup GitHub Secrets for automatic deployment:**

```bash
# In https://github.com/nanuckagent/agendaflow/settings/secrets

DEPLOY_KEY=<private-ssh-key>
VPS_HOST=nanuck.com.br
VPS_USER=root
```

## Troubleshooting

### Services not starting?

```bash
# Check logs
docker compose -f infra/docker-compose.prod.yml logs

# Verify .env.production has all required vars
cat .env.production | grep -v "^#" | grep -v "^$"

# Check Traefik is running
docker compose -f /opt/traefik/docker-compose.yml ps
```

### Database connection failing?

```bash
# Test connection from backend
docker compose -f infra/docker-compose.prod.yml exec backend \
  psql -h db -U agendaflow -d agendaflow_prod -c "SELECT 1"

# Check if database exists
docker compose -f infra/docker-compose.prod.yml exec db \
  psql -U agendaflow -l
```

### SSL/TLS not working?

```bash
# Check Traefik logs for certificate errors
docker logs traefik | grep -i "tls\|cert\|cloudflare"

# Verify Cloudflare API tokens
echo $CF_DNS_API_TOKEN | wc -c  # Should be non-empty

# Manual cert renewal
docker compose -f infra/docker-compose.prod.yml down
docker volume rm traefik_letsencrypt
docker compose -f /opt/traefik/docker-compose.yml up -d
```

### Payments not working?

```bash
# Verify MercadoPago credentials
docker compose -f infra/docker-compose.prod.yml exec backend \
  echo $MERCADOPAGO_ACCESS_TOKEN | wc -c

# Test webhook endpoint
curl -X POST https://agendaflow.nanuck.com.br/webhook/mercadopago \
  -H "Content-Type: application/json" \
  -d '{"type":"payment.created","data":{"id":12345}}'
```

## Performance Tuning

### PostgreSQL

```sql
-- Connect to database
docker compose -f infra/docker-compose.prod.yml exec db psql -U agendaflow -d agendaflow_prod

-- Show current settings
SHOW shared_buffers;
SHOW effective_cache_size;
SHOW work_mem;

-- Optimize for 4GB RAM server:
ALTER SYSTEM SET shared_buffers = '512MB';
ALTER SYSTEM SET effective_cache_size = '2GB';
ALTER SYSTEM SET work_mem = '32MB';

-- Apply changes
SELECT pg_reload_conf();
```

### Redis

```bash
# Monitor Redis memory usage
docker compose -f infra/docker-compose.prod.yml exec redis \
  redis-cli --no-auth-warning -a $REDIS_PASSWORD info memory

# Clear old cache
docker compose -f infra/docker-compose.prod.yml exec redis \
  redis-cli --no-auth-warning -a $REDIS_PASSWORD FLUSHALL
```

## Scaling

To handle more traffic, add more backend instances:

```bash
# Scale backend to 3 instances
docker compose -f infra/docker-compose.prod.yml up -d --scale backend=3

# Traefik will automatically load-balance between them
```

## Support & Rollback

### View deployment history

```bash
git log --oneline
```

### Rollback to previous version

```bash
# Reset to previous commit
git reset --hard <commit-hash>

# Rebuild and redeploy
docker compose -f infra/docker-compose.prod.yml down
docker compose -f infra/docker-compose.prod.yml up -d
docker compose -f infra/docker-compose.prod.yml exec backend npm run migrate
```

## Success Indicators

✅ All containers running: `docker compose ps` shows all services HEALTHY
✅ API responding: `curl https://agendaflow.nanuck.com.br/healthz` returns 200
✅ Frontend serving: `curl https://agendaflow.nanuck.com.br/` returns HTML
✅ Database connected: `docker logs agendaflow-backend` shows no connection errors
✅ SSL working: Browser shows 🔒 padlock without warnings
✅ Google OAuth working: Can see OAuth consent screen at /v1/auth/google
✅ Traefik routing: All routers HEALTHY in `docker logs traefik`

---

**Next Steps:**
1. Configure Google OAuth application in Google Cloud Console
2. Setup Twilio account for SMS notifications (optional)
3. Configure MercadoPago sandbox/production keys
4. Invite users and test booking flow
5. Monitor logs for any issues: `make logs` or `docker compose logs -f`

For questions: Check `/root/products/agendaflow/` documentation or README.md
