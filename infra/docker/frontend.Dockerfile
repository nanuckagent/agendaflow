# Multi-stage build: Builder + Nginx
# AgendaFlow Frontend Dockerfile

# ────────────────────────────────────────────────────────────────────────────
# Stage 1: Builder
# ────────────────────────────────────────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

ARG VITE_API_URL=https://agendaflow.nanuck.com.br
ARG VITE_APP_ENV=production
ARG VITE_APP_VERSION=0.1.0

ENV VITE_API_URL=$VITE_API_URL
ENV VITE_APP_ENV=$VITE_APP_ENV
ENV VITE_APP_VERSION=$VITE_APP_VERSION

RUN npm install -g pnpm@9.0.0

COPY package.json pnpm-workspace.yaml ./
COPY ./src/frontend/package.json ./src/frontend/
COPY ./src/frontend/tsconfig.json ./src/frontend/
COPY ./src/frontend/vite.config.ts ./src/frontend/
COPY ./src/frontend/index.html ./src/frontend/
COPY ./src/frontend/tailwind.config.js ./src/frontend/
COPY ./src/frontend/postcss.config.js ./src/frontend/

RUN pnpm install --recursive

COPY ./src/frontend/src ./src/frontend/src

RUN cd src/frontend && pnpm run build

# ────────────────────────────────────────────────────────────────────────────
# Stage 2: Runtime (Nginx)
# ────────────────────────────────────────────────────────────────────────────
FROM nginx:alpine

WORKDIR /usr/share/nginx/html

COPY --from=builder /app/src/frontend/dist .

COPY ./src/frontend/nginx.conf /etc/nginx/nginx.conf

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
  CMD wget -qO- http://127.0.0.1/health || exit 1
