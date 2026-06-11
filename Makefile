.PHONY: help up down logs logs-backend logs-worker logs-frontend \
        migrate migrate-new seed backup restore \
        shell-db shell-redis test test-coverage test-e2e security-scan \
        deploy rollback status health build clean

PROJECT_DIR := $(shell pwd)
DOCKER_COMPOSE := docker compose -f infra/docker-compose.yml
ENV_FILE := .env.development

# Default target
.DEFAULT_GOAL := help

# ────────────────────────────────────────────────────────────────────────────
# HELP
# ────────────────────────────────────────────────────────────────────────────

help:
	@echo "╔════════════════════════════════════════════════════════════╗"
	@echo "║   AgendaFlow — Comandos disponíveis                        ║"
	@echo "╚════════════════════════════════════════════════════════════╝"
	@echo ""
	@echo "LOCAL DEVELOPMENT"
	@echo "  make up                 Subir serviços (db, redis, backend, worker, frontend)"
	@echo "  make down               Desligar serviços"
	@echo "  make logs               Exibir logs de todos os serviços"
	@echo "  make logs-backend       Logs do backend"
	@echo "  make logs-worker        Logs do worker"
	@echo "  make logs-frontend      Logs do frontend"
	@echo "  make status             Status dos containers (docker compose ps)"
	@echo "  make health             Verificar healthz + readyz"
	@echo ""
	@echo "DATABASE & MIGRATIONS"
	@echo "  make migrate            Rodar migrations"
	@echo "  make migrate-new        Criar novo arquivo de migration"
	@echo "  make seed               Rodar seed de dados iniciais"
	@echo "  make shell-db           Abrir shell PostgreSQL"
	@echo "  make shell-redis        Abrir shell Redis"
	@echo ""
	@echo "TESTING & SECURITY"
	@echo "  make test               Rodar testes unitários"
	@echo "  make test-coverage      Testes com cobertura"
	@echo "  make test-e2e           Testes E2E com Playwright"
	@echo "  make security-scan      npm audit (backend + frontend)"
	@echo ""
	@echo "BUILD & CLEANUP"
	@echo "  make build              Buildar images Docker localmente"
	@echo "  make clean              Remover containers, volumes, dist/"
	@echo ""

# ────────────────────────────────────────────────────────────────────────────
# LOCAL DEVELOPMENT
# ────────────────────────────────────────────────────────────────────────────

up:
	@echo "📦 Levantando serviços..."
	@$(DOCKER_COMPOSE) up -d
	@echo ""
	@echo "✅ Serviços no ar!"
	@echo ""
	@echo "   Backend: http://localhost:8000"
	@echo "   Frontend: http://localhost:5173 (dev)"
	@echo "   Redis: localhost:6379"
	@echo "   PostgreSQL: localhost:5432"
	@echo ""
	@echo "💡 Próximos passos:"
	@echo "   make migrate  # Rodar migrations"
	@echo "   make seed     # Inserir dados iniciais"
	@echo "   make logs     # Ver logs em tempo real"
	@echo ""

down:
	@echo "Desligando serviços..."
	@$(DOCKER_COMPOSE) down
	@echo "✅ Serviços desligados"

logs:
	$(DOCKER_COMPOSE) logs -f

logs-backend:
	$(DOCKER_COMPOSE) logs -f backend

logs-worker:
	$(DOCKER_COMPOSE) logs -f worker

logs-frontend:
	$(DOCKER_COMPOSE) logs -f frontend

status:
	@$(DOCKER_COMPOSE) ps

health:
	@echo "📊 Healthz (liveness):"
	@curl -s http://localhost:8000/healthz | jq . || echo "❌ Backend indisponível"
	@echo ""
	@echo "📊 Readyz (readiness — checks DB + Redis):"
	@curl -s http://localhost:8000/readyz | jq . || echo "❌ Backend degradado"

# ────────────────────────────────────────────────────────────────────────────
# DATABASE & MIGRATIONS
# ────────────────────────────────────────────────────────────────────────────

migrate:
	@echo "🗄️  Rodando migrations..."
	@cd src/backend && npm run db:migrate
	@echo "✅ Migrations completas"

migrate-new:
	@read -p "📝 Nome da migration (ex: create_users_table): " name; \
	timestamp=$$(date +%s); \
	migration_file="src/backend/src/db/migrations/$${timestamp}_$${name}.sql"; \
	mkdir -p $$(dirname "$$migration_file"); \
	echo "-- Migration: $$name\n\n" > "$$migration_file"; \
	echo "✅ Migration criada: $$migration_file"

seed:
	@echo "🌱 Rodando seed de dados iniciais..."
	@cd src/backend && npm run seed || echo "⚠️  Seed script não encontrado ou erro"
	@echo "✅ Seed completo"

shell-db:
	@echo "🗄️  Abrindo shell PostgreSQL..."
	@$(DOCKER_COMPOSE) exec db psql -U agendaflow -d agendaflow

shell-redis:
	@echo "🔴 Abrindo shell Redis..."
	@REDIS_PASSWORD=$$(grep REDIS_PASSWORD $(ENV_FILE) 2>/dev/null | cut -d= -f2 || echo "password"); \
	$(DOCKER_COMPOSE) exec redis redis-cli -a "$$REDIS_PASSWORD"

# ────────────────────────────────────────────────────────────────────────────
# TESTING & SECURITY
# ────────────────────────────────────────────────────────────────────────────

test:
	@echo "🧪 Rodando testes..."
	@npm run test --workspaces

test-coverage:
	@echo "🧪 Rodando testes com cobertura..."
	@npm run test:coverage --workspaces
	@echo "📊 Relatórios em: src/*/coverage/"

test-e2e:
	@echo "🎭 Rodando testes E2E (Playwright)..."
	@cd src/frontend && npm run e2e

security-scan:
	@echo "🔒 Rodando scans de segurança..."
	@echo ""
	@echo "📦 Backend (npm audit):"
	@cd src/backend && npm audit || true
	@echo ""
	@echo "📦 Frontend (npm audit):"
	@cd src/frontend && npm audit || true

# ────────────────────────────────────────────────────────────────────────────
# BUILD & CLEANUP
# ────────────────────────────────────────────────────────────────────────────

build:
	@echo "🔨 Buildando images Docker..."
	@$(DOCKER_COMPOSE) build
	@echo "✅ Build completo"

clean:
	@echo "🧹 Limpando containers, volumes e artifacts..."
	@$(DOCKER_COMPOSE) down -v
	@rm -rf src/backend/dist src/frontend/dist
	@echo "✅ Limpeza completa"
