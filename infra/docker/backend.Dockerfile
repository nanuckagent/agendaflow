# Multi-stage build: Builder + Runtime
# AgendaFlow Backend Dockerfile

# ────────────────────────────────────────────────────────────────────────────
# Stage 1: Builder
# ────────────────────────────────────────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

RUN npm install -g pnpm@9.0.0

COPY package.json pnpm-workspace.yaml ./
COPY ./src/shared/package.json ./src/shared/
COPY ./src/shared/tsconfig.json ./src/shared/
COPY ./src/backend/package.json ./src/backend/
COPY ./src/backend/tsconfig.json ./src/backend/
COPY ./src/backend/tsconfig.build.json ./src/backend/

RUN pnpm install --recursive

COPY ./src/shared/src ./src/shared/src
COPY ./src/backend/src ./src/backend/src

# outDir of tsconfig.build.json is /app/dist/backend
RUN cd src/backend && \
    ./node_modules/.bin/tsc -p tsconfig.build.json && \
    ./node_modules/.bin/tsc-alias -p tsconfig.build.json

# ────────────────────────────────────────────────────────────────────────────
# Stage 2: Runtime
# ────────────────────────────────────────────────────────────────────────────
FROM node:20-alpine

ENV NODE_ENV=production

RUN apk add --no-cache dumb-init curl

# Preserve pnpm workspace layout so symlinked node_modules keep resolving
COPY --from=builder /app/node_modules /app/node_modules
COPY --from=builder /app/src/shared /app/src/shared
COPY --from=builder /app/src/backend/node_modules /app/src/backend/node_modules
COPY --from=builder /app/src/backend/package.json /app/src/backend/package.json
# dist must live under src/backend so Node module resolution finds the pnpm-linked node_modules
COPY --from=builder /app/dist/backend /app/src/backend/dist

WORKDIR /app/src/backend

USER node

HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
  CMD curl -f http://127.0.0.1:8000/healthz || exit 1

EXPOSE 8000

ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "--enable-source-maps", "dist/src/index.js"]
