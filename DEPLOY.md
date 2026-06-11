# Production Deployment Guide

AgendaFlow is deployed to production using Docker Compose with Traefik for reverse proxy and SSL/TLS termination via Cloudflare.

## Prerequisites

### VPS Requirements
- Ubuntu 22.04+ LTS
- Docker Engine 24.0+
- Docker Compose 2.20+
- Git with SSH access to GitHub
- 2+ GB RAM, 20+ GB disk space
- Static public IP address

### Infrastructure
- **Traefik** running on shared network `proxy` (see [VPS Infrastructure](../saas-constructor/docs/vps-infrastructure.md))
- **Cloudflare DNS** configured for `agendaflow.nanuck.com.br`
- **GitHub Secrets** configured in repository settings

## Initial Setup

### 1. Clone Repository

```bash
mkdir -p /opt
cd /opt
git clone git@github.com:nanuckagent/agendaflow.git
cd agendaflow
```

### 2. Configure Environment Variables

Create `.env.production` in the project root:

```bash
cp .env.example .env.production
```

Update the following required variables:

```env
# ────────────────────────────────────────────────────────────────────────────
# APPLICATION
# ────────────────────────────────────────────────────────────────────────────
NODE_ENV=production
APP_ROLE=api
APP_VERSION=0.1.0

# ────────────────────────────────────────────────────────────────────────────
# DATABASE (use strong password, min 32 chars)
# ────────────────────────────────────────────────────────────────────────────
POSTGRES_DB=agendaflow
POSTGRES_USER=agendaflow
POSTGRES_PASSWORD=<generate-strong-password-here>
DATABASE_URL=postgresql://agendaflow:POSTGRES_PASSWORD@db:5432/agendaflow

# ────────────────────────────────────────────────────────────────────────────
# REDIS (use strong password, min 32 chars)
# ────────────────────────────────────────────────────────────────────────────
REDIS_PASSWORD=<generate-strong-password-here>
REDIS_URL=redis://:REDIS_PASSWORD@redis:6379

# ────────────────────────────────────────────────────────────────────────────
# JWT & SECURITY
# ────────────────────────────────────────────────────────────────────────────
JWT_SECRET=<generate-jwt-secret-min-32-chars>
JWT_EXPIRES_IN=7d
SESSION_SECRET=<generate-session-secret-min-32-chars>

# ────────────────────────────────────────────────────────────────────────────
# API & FRONTEND
# ────────────────────────────────────────────────────────────────────────────
API_URL=https://agendaflow.nanuck.com.br
VITE_API_URL=https://agendaflow.nanuck.com.br
VITE_APP_ENV=production

# ────────────────────────────────────────────────────────────────────────────
# LOGGING
# ────────────────────────────────────────────────────────────────────────────
LOG_LEVEL=info
LOG_FORMAT=json

# ────────────────────────────────────────────────────────────────────────────
# EXTERNAL INTEGRATIONS (optional)
# ────────────────────────────────────────────────────────────────────────────
GOOGLE_CALENDAR_CLIENT_ID=
GOOGLE_CALENDAR_CLIENT_SECRET=
OUTLOOK_CLIENT_ID=
OUTLOOK_CLIENT_SECRET=
SLACK_BOT_TOKEN=

# ────────────────────────────────────────────────────────────────────────────
# SENTRY MONITORING (optional)
# ────────────────────────────────────────────────────────────────────────────
SENTRY_DSN=
```

### 3. Verify Traefik is Running

```bash
docker ps | grep traefik
```

Output should show traefik container running with network `proxy`. If not, follow the [VPS Infrastructure setup guide](../saas-constructor/docs/vps-infrastructure.md).

### 4. Configure GitHub Secrets

Go to **GitHub Repository Settings → Secrets and variables → Actions** and add:

| Secret Name | Value | Example |
|---|---|---|
| `DEPLOY_KEY` | SSH private key (RSA format) | `-----BEGIN OPENSSH PRIVATE KEY-----\n...` |
| `VPS_HOST` | VPS public IP or hostname | `agendaflow.example.com` |
| `VPS_USER` | SSH user for deployment | `ubuntu` or `deploy` |

Generate SSH key pair for deployment:

```bash
ssh-keygen -t rsa -b 4096 -f deploy_key -N ""
```

Add public key to VPS `~/.ssh/authorized_keys` and add private key to GitHub Secrets.

## Deployment

### Automatic Deployment (CI/CD)

Push to `main` branch to automatically:
1. Run lint, typecheck, tests
2. Build Docker images
3. Push to GitHub Container Registry
4. Deploy to VPS

```bash
git push origin main
```

Monitor deployment: **GitHub → Actions → Deploy to Production**

### Manual Deployment

```bash
cd /opt/agendaflow

# Pull latest code
git pull origin main

# Pull latest images (or rebuild locally)
docker compose -f infra/docker-compose.prod.yml pull

# Start services
docker compose -f infra/docker-compose.prod.yml up -d

# Run migrations
docker compose -f infra/docker-compose.prod.yml exec backend npm run db:migrate

# Verify health
curl https://agendaflow.nanuck.com.br/healthz | jq .
```

## Health Checks

### Liveness Probe (is the app running?)
```bash
curl https://agendaflow.nanuck.com.br/healthz
# Expected: 200 OK, JSON response
```

### Readiness Probe (is the app ready to serve traffic?)
```bash
curl https://agendaflow.nanuck.com.br/readyz
# Expected: 200 OK if healthy, 503 if degraded (DB/Redis down)
```

### Metrics (admin only, IP whitelisted)
```bash
curl https://agendaflow.nanuck.com.br/metrics
# Expected: Prometheus format metrics
```

## Monitoring

### View Logs

```bash
# All services
docker compose -f infra/docker-compose.prod.yml logs -f

# Specific service
docker compose -f infra/docker-compose.prod.yml logs -f backend
docker compose -f infra/docker-compose.prod.yml logs -f worker
docker compose -f infra/docker-compose.prod.yml logs -f frontend
```

### Database Backup

```bash
# Manual backup
docker compose -f infra/docker-compose.prod.yml exec db pg_dump -U agendaflow -d agendaflow | gzip > backup-$(date +%Y%m%d).sql.gz

# Restore from backup
gunzip < backup-20240611.sql.gz | docker compose -f infra/docker-compose.prod.yml exec -T db psql -U agendaflow -d agendaflow
```

### Redis Backup

```bash
# Redis is persisted in docker volume: agendaflow_redis_data
docker compose -f infra/docker-compose.prod.yml exec redis redis-cli --no-auth-warning -a $REDIS_PASSWORD BGSAVE

# Check snapshot
docker compose -f infra/docker-compose.prod.yml exec redis redis-cli --no-auth-warning -a $REDIS_PASSWORD LASTSAVE
```

## Scaling

### Horizontal Scaling (Multiple Workers)

```bash
# Scale worker service to 3 instances
docker compose -f infra/docker-compose.prod.yml up -d --scale worker=3
```

Update `docker-compose.prod.yml` to add specific worker names if needed:

```yaml
worker-1:
  image: ghcr.io/nanuckagent/agendaflow-backend:latest
  environment:
    APP_ROLE: worker
    WORKER_CONCURRENCY: 5  # Process 5 jobs at a time

worker-2:
  image: ghcr.io/nanuckagent/agendaflow-backend:latest
  environment:
    APP_ROLE: worker
    WORKER_CONCURRENCY: 5
```

## SSL/TLS Configuration

AgendaFlow uses **Cloudflare** for DNS and SSL/TLS:

1. **DNS Records** (in Cloudflare dashboard)
   - Type: CNAME
   - Name: agendaflow
   - Value: your-vps-ip-or-hostname
   - Proxy: Proxied (orange cloud)

2. **SSL/TLS** (in Cloudflare dashboard)
   - SSL/TLS Encryption: Full or Full (strict)
   - Always Use HTTPS: On
   - Edge Certificates: Auto

3. **Traefik Configuration** (automatic via labels)
   - Cert resolver: `cloudflare`
   - Automatically requests certificates on deployment

## Troubleshooting

### Backend not starting

```bash
# Check logs
docker compose -f infra/docker-compose.prod.yml logs backend

# Verify database connection
docker compose -f infra/docker-compose.prod.yml exec backend curl http://127.0.0.1:8000/readyz

# Check environment variables
docker compose -f infra/docker-compose.prod.yml exec backend env | grep DATABASE_URL
```

### Database connection issues

```bash
# Check PostgreSQL is running
docker compose -f infra/docker-compose.prod.yml ps db

# Test connection
docker compose -f infra/docker-compose.prod.yml exec db psql -U agendaflow -d agendaflow -c "SELECT 1"

# Check logs
docker compose -f infra/docker-compose.prod.yml logs db
```

### Redis connection issues

```bash
# Check Redis is running
docker compose -f infra/docker-compose.prod.yml ps redis

# Test connection
docker compose -f infra/docker-compose.prod.yml exec redis redis-cli -a $REDIS_PASSWORD ping

# Check logs
docker compose -f infra/docker-compose.prod.yml logs redis
```

### HTTPS/Traefik issues

```bash
# Check Traefik logs
docker logs traefik

# Verify container is on proxy network
docker network inspect proxy | grep agendaflow

# Check certificate files
docker exec traefik ls -la /letsencrypt/

# Re-issue certificate
docker compose -f infra/docker-compose.prod.yml down
docker compose -f infra/docker-compose.prod.yml up -d
```

### Frontend not serving correctly

```bash
# Check Nginx config is mounted
docker compose -f infra/docker-compose.prod.yml exec frontend ls -la /etc/nginx/nginx.conf

# Check HTML is in place
docker compose -f infra/docker-compose.prod.yml exec frontend ls -la /usr/share/nginx/html/

# Test health endpoint
curl http://127.0.0.1/health
```

## Rollback

If deployment fails, rollback to previous version:

```bash
cd /opt/agendaflow

# Check git history
git log --oneline | head -5

# Checkout previous version
git checkout <commit-hash>

# Restart services with previous version
docker compose -f infra/docker-compose.prod.yml pull
docker compose -f infra/docker-compose.prod.yml up -d

# Verify
curl https://agendaflow.nanuck.com.br/healthz
```

## Security Considerations

1. **Secrets Management**
   - Use long, random passwords (32+ chars)
   - Rotate monthly via GitHub Secrets
   - Never commit `.env.production` to git

2. **Network**
   - Database and Redis only on internal network
   - Backend exposed only to Traefik
   - Frontend serves static files via Nginx

3. **Metrics/Admin Routes**
   - `/metrics` protected by IP whitelist
   - Configure in Traefik middleware: `ip-whitelist-admin@file`
   - Only admin IPs can access

4. **Updates**
   - Keep Node.js, PostgreSQL, Redis updated
   - Test updates on staging first
   - Use tags for reproducible deployments

## Support

For issues or questions:
- Check logs: `make logs` (local) or `docker compose logs` (production)
- Review [CLAUDE.md](./CLAUDE.md) for architecture rules
- See [VPS Infrastructure](../saas-constructor/docs/vps-infrastructure.md) for shared infrastructure
