# Worker Dockerfile
# AgendaFlow Background Job Worker using BullMQ
# Shares the same codebase as backend but runs with APP_ROLE=worker

# ────────────────────────────────────────────────────────────────────────────
# Stage 1: Builder (identical to backend)
# ────────────────────────────────────────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

# Copy monorepo configuration and dependency files
COPY package.json .
COPY ./src/shared/package.json ./src/shared/
COPY ./src/backend/package.json ./src/backend/
COPY ./src/backend/tsconfig.json ./src/backend/
COPY ./src/backend/tsconfig.build.json ./src/backend/

# Install all dependencies
RUN npm ci --workspaces

# Copy source code
COPY ./src/shared/src ./src/shared/src
COPY ./src/backend/src ./src/backend/src

# Build backend
RUN npm run build -w agendaflow-backend

# ────────────────────────────────────────────────────────────────────────────
# Stage 2: Runtime
# ────────────────────────────────────────────────────────────────────────────
FROM node:20-alpine

WORKDIR /app

ENV NODE_ENV=production
ENV APP_ROLE=worker

# Install runtime dependencies (dumb-init for signal handling)
RUN apk add --no-cache dumb-init

# Copy built application
COPY --from=builder /app/src/backend/dist ./dist
COPY --from=builder /app/src/backend/package.json ./package.json

# Copy production dependencies
RUN npm ci --omit=dev --workspaces=false

# Create non-root user
RUN addgroup -g 1001 -S node && adduser -S node -u 1001 -G node
USER node

# Note: Worker processes don't need EXPOSE or HEALTHCHECK
# They listen on Redis for job queues internally

# Use dumb-init for graceful shutdown
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "--enable-source-maps", "dist/backend/src/index.js"]
