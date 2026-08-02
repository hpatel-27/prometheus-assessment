# syntax=docker/dockerfile:1
#
# Frontend production image: builds the static bundle with Vite and serves it
# with nginx. Build from the repository root so the shared package is available:
#   docker build -f frontend/Dockerfile \
#     --build-arg VITE_API_BASE_URL=https://api.example.com \
#     -t prometheus-frontend .

# ---- Build stage: compile the SPA to static assets ----
FROM node:22-alpine AS builder
WORKDIR /app

# The backend origin is inlined into the bundle at BUILD time (Vite replaces
# `import.meta.env.VITE_*`). It cannot be changed after the image is built, so a
# new image must be built per target environment / API origin.
ARG VITE_API_BASE_URL
ENV VITE_API_BASE_URL=${VITE_API_BASE_URL}

# Manifests first for dependency-layer caching. The backend workspace is not
# needed to build the frontend, so only shared + frontend are installed.
COPY package.json package-lock.json tsconfig.base.json ./
COPY shared/package.json ./shared/package.json
COPY frontend/package.json ./frontend/package.json
RUN npm ci --workspace shared --workspace frontend --include-workspace-root

# Build the shared contracts first (Vite resolves `@prometheus/shared` to its
# compiled output), then bundle the frontend.
COPY shared ./shared
COPY frontend ./frontend
RUN npm run build --workspace @prometheus/shared \
 && npm run build --workspace frontend

# ---- Runtime stage: static file server ----
FROM nginx:1.27-alpine AS runner

# Replace the default server block with our SPA config (gzip, asset caching,
# history-API fallback).
COPY frontend/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/frontend/dist /usr/share/nginx/html

EXPOSE 80
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD wget --quiet --spider http://127.0.0.1:80/ || exit 1

# nginx:alpine's default CMD already runs nginx in the foreground.
