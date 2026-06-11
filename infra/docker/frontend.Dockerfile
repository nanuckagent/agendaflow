# Multi-stage build: Builder + Nginx
# AgendaFlow Frontend Dockerfile
# Builds React SPA with Vite and serves with Nginx

# ────────────────────────────────────────────────────────────────────────────
# Stage 1: Builder
# ────────────────────────────────────────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

# Build-time configuration (can be overridden during docker build)
ARG VITE_API_URL=http://localhost:8000
ARG VITE_APP_ENV=production
ARG VITE_APP_VERSION=0.1.0

ENV VITE_API_URL=$VITE_API_URL
ENV VITE_APP_ENV=$VITE_APP_ENV
ENV VITE_APP_VERSION=$VITE_APP_VERSION

# Copy monorepo configuration and dependency files
COPY package.json .
COPY ./src/shared/package.json ./src/shared/
COPY ./src/frontend/package.json ./src/frontend/
COPY ./src/frontend/tsconfig.json ./src/frontend/
COPY ./src/frontend/vite.config.ts ./src/frontend/
COPY ./src/frontend/index.html ./src/frontend/

# Install dependencies
RUN npm ci --workspaces

# Copy source code for both shared and frontend
COPY ./src/shared/src ./src/shared/src
COPY ./src/frontend/src ./src/frontend/src
COPY ./src/frontend/public ./src/frontend/public

# Build frontend: compile React with Vite (optimized for production)
RUN npm run build -w agendaflow-frontend

# ────────────────────────────────────────────────────────────────────────────
# Stage 2: Runtime (Nginx)
# ────────────────────────────────────────────────────────────────────────────
FROM nginx:alpine

WORKDIR /usr/share/nginx/html

# Copy built SPA from builder stage
COPY --from=builder /app/src/frontend/dist .

# Copy Nginx configuration for SPA routing and performance
COPY ./src/frontend/nginx.conf /etc/nginx/nginx.conf

# Expose HTTP port
EXPOSE 80

# Health check: readiness probe (checks HTTP response)
HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
  CMD wget -qO- http://127.0.0.1/health || exit 1
