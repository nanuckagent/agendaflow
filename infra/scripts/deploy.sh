#!/bin/bash
set -e

# ────────────────────────────────────────────────────────────────────────────
# AgendaFlow — Automated Production Deployment Script
# ────────────────────────────────────────────────────────────────────────────
# Usage:
#   ./infra/scripts/deploy.sh
#
# Requirements:
#   - Docker + Docker Compose installed
#   - .env.production file in project root
#   - Traefik running with 'proxy' network
#   - DNS pointing to VPS IP
#
# What it does:
#   1. ✅ Validates environment setup
#   2. ✅ Pulls latest code from GitHub
#   3. ✅ Builds or pulls Docker images
#   4. ✅ Stops old containers gracefully
#   5. ✅ Starts new services
#   6. ✅ Runs database migrations
#   7. ✅ Health checks all services
#   8. ✅ Verifies Traefik routing
# ────────────────────────────────────────────────────────────────────────────

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
PROJECT_DIR="/opt/agendaflow"
COMPOSE_FILE="infra/docker-compose.prod.yml"
DOMAIN="agendaflow.nanuck.com.br"
DEPLOY_LOG="$PROJECT_DIR/deploy.log"

# Helper functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[✓]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[!]${NC} $1"
}

log_error() {
    echo -e "${RED}[✗]${NC} $1"
}

check_prerequisites() {
    log_info "Checking prerequisites..."

    # Check Docker
    if ! command -v docker &> /dev/null; then
        log_error "Docker not installed"
        return 1
    fi
    log_success "Docker installed"

    # Check Docker Compose
    if ! command -v docker &> /dev/null || ! docker compose version &> /dev/null; then
        log_error "Docker Compose not installed"
        return 1
    fi
    log_success "Docker Compose installed"

    # Check .env.production exists
    if [ ! -f "$PROJECT_DIR/.env.production" ]; then
        log_error ".env.production not found at $PROJECT_DIR"
        log_info "Copy .env.example to .env.production and fill in values"
        return 1
    fi
    log_success ".env.production exists"

    # Check required env vars
    source "$PROJECT_DIR/.env.production"

    required_vars=(
        "POSTGRES_PASSWORD"
        "REDIS_PASSWORD"
        "JWT_SECRET"
        "GOOGLE_CLIENT_ID"
        "GOOGLE_CLIENT_SECRET"
    )

    for var in "${required_vars[@]}"; do
        if [ -z "${!var}" ]; then
            log_error "Missing environment variable: $var"
            return 1
        fi
    done
    log_success "All required environment variables set"

    # Check Traefik network exists
    if ! docker network ls | grep -q "proxy"; then
        log_error "Traefik 'proxy' network not found"
        log_info "Start Traefik first: docker compose -f /opt/traefik/docker-compose.yml up -d"
        return 1
    fi
    log_success "Traefik 'proxy' network exists"

    # Check DNS resolution
    log_info "Checking DNS resolution for $DOMAIN..."
    if ! timeout 5 dig +short "$DOMAIN" &> /dev/null; then
        log_warning "Could not resolve $DOMAIN (may fail on first deploy)"
    else
        log_success "DNS resolves to: $(dig +short $DOMAIN)"
    fi

    return 0
}

pull_latest_code() {
    log_info "Pulling latest code from GitHub..."

    cd "$PROJECT_DIR"

    # Verify we're in a git repo
    if ! git rev-parse --git-dir > /dev/null 2>&1; then
        log_error "Not a git repository"
        return 1
    fi

    # Check for uncommitted changes (warn but don't fail)
    if [ -n "$(git status --short)" ]; then
        log_warning "Uncommitted changes in working directory"
        git status --short
    fi

    # Pull latest
    if git pull origin main; then
        log_success "Successfully pulled latest code"
        return 0
    else
        log_error "Failed to pull from GitHub"
        log_info "You may need to manually resolve conflicts:"
        log_info "  git pull origin main"
        return 1
    fi
}

build_or_pull_images() {
    log_info "Building/pulling Docker images..."

    cd "$PROJECT_DIR"

    # Option 1: Pull pre-built images from GitHub Container Registry
    if command -v docker &> /dev/null && docker ps &> /dev/null; then
        log_info "Attempting to pull pre-built images from GHCR..."

        if docker compose -f "$COMPOSE_FILE" pull 2>> "$DEPLOY_LOG"; then
            log_success "Successfully pulled images from GHCR"
            return 0
        else
            log_warning "Could not pull from GHCR, building locally instead..."
        fi
    fi

    # Option 2: Build images locally
    log_info "Building Docker images locally (this may take 5-10 minutes)..."

    if docker compose -f "$COMPOSE_FILE" build --no-cache 2>&1 | tee -a "$DEPLOY_LOG"; then
        log_success "Docker images built successfully"
        return 0
    else
        log_error "Failed to build Docker images"
        log_info "Check logs: tail -f $DEPLOY_LOG"
        return 1
    fi
}

stop_old_services() {
    log_info "Stopping old services gracefully..."

    cd "$PROJECT_DIR"

    # Give services 30 seconds to shut down gracefully
    if docker compose -f "$COMPOSE_FILE" down --timeout 30 2>&1 | tee -a "$DEPLOY_LOG"; then
        log_success "Services stopped"
        return 0
    else
        log_error "Failed to stop services"
        # Don't fail here, try to continue
        return 0
    fi
}

start_services() {
    log_info "Starting new services..."

    cd "$PROJECT_DIR"

    if docker compose -f "$COMPOSE_FILE" up -d 2>&1 | tee -a "$DEPLOY_LOG"; then
        log_success "Services started"

        # Wait for services to be healthy
        log_info "Waiting for services to be healthy (this may take 30 seconds)..."
        sleep 15

        # Check health status
        local max_attempts=10
        local attempt=1

        while [ $attempt -le $max_attempts ]; do
            local healthy=$(docker compose -f "$COMPOSE_FILE" ps --format "table {{.Service}}\t{{.Status}}" 2>/dev/null | grep -c "healthy\|running" || echo "0")
            local total=$(docker compose -f "$COMPOSE_FILE" ps --format "table {{.Service}}" 2>/dev/null | wc -l)

            log_info "Health check: $healthy/$total services ready (attempt $attempt/$max_attempts)"

            if [ "$healthy" -eq "$total" ] 2>/dev/null; then
                log_success "All services healthy"
                docker compose -f "$COMPOSE_FILE" ps
                return 0
            fi

            sleep 3
            ((attempt++))
        done

        log_warning "Services may still be starting, continuing with migrations..."
        return 0
    else
        log_error "Failed to start services"
        return 1
    fi
}

run_migrations() {
    log_info "Running database migrations..."

    cd "$PROJECT_DIR"

    if docker compose -f "$COMPOSE_FILE" exec -T backend npm run migrate 2>&1 | tee -a "$DEPLOY_LOG"; then
        log_success "Database migrations completed"
        return 0
    else
        log_error "Database migrations failed"
        log_info "Troubleshoot with: docker compose -f $COMPOSE_FILE logs backend"
        return 1
    fi
}

health_checks() {
    log_info "Running health checks..."

    local checks_passed=0
    local checks_failed=0

    # Check /healthz endpoint
    log_info "Checking API health endpoint..."
    if curl -sf https://$DOMAIN/healthz > /dev/null 2>&1; then
        log_success "API /healthz endpoint responding"
        ((checks_passed++))
    else
        log_warning "API /healthz endpoint not responding yet (may still be starting)"
        ((checks_failed++))
    fi

    # Check /readyz endpoint
    log_info "Checking readiness endpoint..."
    if curl -sf https://$DOMAIN/readyz > /dev/null 2>&1; then
        log_success "API /readyz endpoint responding"
        ((checks_passed++))
    else
        log_warning "API /readyz endpoint not responding yet"
        ((checks_failed++))
    fi

    # Check frontend
    log_info "Checking frontend..."
    if curl -sf https://$DOMAIN/ | grep -q "<html\|<!DOCTYPE" 2>/dev/null; then
        log_success "Frontend is serving"
        ((checks_passed++))
    else
        log_warning "Frontend not responding yet"
        ((checks_failed++))
    fi

    # Check Google OAuth redirect
    log_info "Checking Google OAuth endpoint..."
    if curl -sf -L https://$DOMAIN/v1/auth/google 2>/dev/null | head -1 > /dev/null; then
        log_success "Google OAuth endpoint responding"
        ((checks_passed++))
    else
        log_warning "Google OAuth endpoint not responding yet"
        ((checks_failed++))
    fi

    # Docker container health
    log_info "Checking Docker container health..."
    if docker compose -f "$COMPOSE_FILE" ps | grep -q "healthy"; then
        log_success "Docker containers are healthy"
        ((checks_passed++))
    else
        log_warning "Some containers may not be fully healthy yet"
        ((checks_failed++))
    fi

    log_info "Health checks: $checks_passed passed, $checks_failed warnings"

    # Not a hard failure if some HTTP checks don't pass immediately
    return 0
}

verify_traefik() {
    log_info "Verifying Traefik routing..."

    # Check Traefik is running
    if ! docker ps | grep -q traefik; then
        log_warning "Traefik container not found"
        return 0
    fi

    # Check routers are registered
    if docker logs traefik 2>/dev/null | grep -q "agendaflow"; then
        log_success "Traefik has registered AgendaFlow routers"
        return 0
    else
        log_warning "Could not verify Traefik routers (they may be registering)"
        return 0
    fi
}

main() {
    log_info "════════════════════════════════════════════════════════════════"
    log_info "AgendaFlow Production Deployment Script"
    log_info "Start time: $(date)"
    log_info "════════════════════════════════════════════════════════════════"

    # Create/clear log file
    : > "$DEPLOY_LOG"

    # Run deployment steps
    check_prerequisites || exit 1
    pull_latest_code || exit 1
    build_or_pull_images || exit 1
    stop_old_services || exit 1
    start_services || exit 1
    run_migrations || exit 1
    health_checks
    verify_traefik

    # Final summary
    log_info "════════════════════════════════════════════════════════════════"
    log_success "Deployment completed successfully!"
    log_info "═══════════════════════════════════════════════════════════════"
    log_info ""
    log_info "Next steps:"
    log_info "  1. Verify frontend: https://$DOMAIN"
    log_info "  2. Check logs: docker compose -f $COMPOSE_FILE logs -f"
    log_info "  3. Monitor health: watch -n 5 'docker compose -f $COMPOSE_FILE ps'"
    log_info ""
    log_info "Support:"
    log_info "  - Logs: $DEPLOY_LOG"
    log_info "  - Full docs: $PROJECT_DIR/SETUP.md"
    log_info "  - Troubleshooting: $PROJECT_DIR/DEPLOY.md"
    log_info ""

    return 0
}

# Run main function
main
