# syntax=docker/dockerfile:1
#
# Backend production image. Build from the repository root so the build context
# includes the workspace root manifest, the lockfile, and the shared package:
#   docker build -f backend/Dockerfile -t prometheus-backend .

# ---- Build stage: install all deps and compile TypeScript to JS ----
FROM node:22-alpine AS builder
WORKDIR /app

# Copy only the manifests first so the dependency layer is cached until a
# manifest or the lockfile changes. Only the shared package is needed alongside
# the backend, so the frontend workspace is intentionally omitted here.
COPY package.json package-lock.json tsconfig.base.json ./
COPY shared/package.json ./shared/package.json
COPY backend/package.json ./backend/package.json
RUN npm ci --workspace shared --workspace backend --include-workspace-root

# Compile the shared contracts first, then the backend (which imports them).
COPY shared ./shared
COPY backend ./backend
RUN npm run build --workspace @prometheus/shared \
 && npm run build --workspace backend

# ---- Runtime stage: production dependencies + compiled output only ----
FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

# Install production dependencies for the backend and shared package only. This
# excludes all devDependencies (TypeScript, eslint, tsx) and the frontend's
# runtime deps, keeping the image small.
COPY package.json package-lock.json ./
COPY shared/package.json ./shared/package.json
COPY backend/package.json ./backend/package.json
RUN npm ci --omit=dev --workspace shared --workspace backend --include-workspace-root \
 && npm cache clean --force

# Compiled JavaScript produced by the build stage. `@prometheus/shared` resolves
# via the workspace symlink npm created above to shared/dist.
COPY --from=builder /app/shared/dist ./shared/dist
COPY --from=builder /app/backend/dist ./backend/dist

# Run as the image's built-in unprivileged user rather than root.
USER node

# Documentation only; the actual port comes from the PORT env var (default 3000).
EXPOSE 3000

# Probe the app's own health endpoint using Node's global fetch, so no extra
# tooling (curl/wget) needs to be installed in the image.
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||3000)+'/health').then((r)=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", "backend/dist/index.js"]
