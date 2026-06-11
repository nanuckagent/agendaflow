# Multi-stage build: Builder + Runtime
# AgendaFlow Backend Dockerfile
# Builds Node.js backend with TypeScript compilation and production-ready runtime

# ────────────────────────────────────────────────────────────────────────────
# Stage 1: Builder
# ────────────────────────────────────────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

# Copy monorepo configuration and dependency files first (for better Docker layer caching)
COPY package.json .
COPY ./src/shared/package.json ./src/shared/
COPY ./src/backend/package.json ./src/backend/
COPY ./src/backend/tsconfig.json ./src/backend/
COPY ./src/backend/tsconfig.build.json ./src/backend/

# Install all dependencies (including dev dependencies for build)
RUN npm ci --workspaces

# Copy source code for all workspaces
COPY ./src/shared/src ./src/shared/src
COPY ./src/backend/src ./src/backend/src

# Build backend: compile TypeScript and resolve path aliases
RUN npm run build -w agendaflow-backend

# ────────────────────────────────────────────────────────────────────────────
# Stage 2: Runtime
# ────────────────────────────────────────────────────────────────────────────
FROM node:20-alpine

WORKDIR /app

ENV NODE_ENV=production

# Install runtime dependencies only (dumb-init for graceful shutdown, curl for healthcheck)
RUN apk add --no-cache dumb-init curl

# Copy built application from builder stage
COPY --from=builder /app/src/backend/dist ./dist
COPY --from=builder /app/src/backend/package.json ./package.json

# Copy production dependencies from builder
RUN npm ci --omit=dev --workspaces=false

# Create non-root user for security (uid 1001 is conventional)
RUN addgroup -g 1001 -S node && adduser -S node -u 1001 -G node
USER node

# Health check: liveness probe (checks if app is running)
HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
  CMD curl -f http://127.0.0.1:8000/healthz || exit 1

# Expose API port
EXPOSE 8000

# Use dumb-init as PID 1 to handle signals properly (SIGTERM for graceful shutdown)
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "--enable-source-maps", "dist/backend/src/index.js"]
