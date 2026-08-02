# Deployment

This document covers building and running the stock market MVP in production
with Docker. It assumes a **single backend instance** — see
[Scaling considerations](#scaling-considerations) before running more.

## Architecture

Two images are produced from the monorepo:

- **backend** — the compiled Express API (`node:22-alpine`).
- **frontend** — the built React SPA served by nginx (`nginx:1.27-alpine`).

The browser loads the SPA from nginx and calls the backend **directly** at
`VITE_API_BASE_URL` (a cross-origin request), so the backend must allow the
frontend's origin via `CORS_ORIGINS`:

```
browser ──GET assets──▶ frontend (nginx :80)
   │
   └──GET /api/stocks/:symbol──▶ backend (Express :3000) ──▶ Yahoo Finance
```

## Quick start (Docker Compose)

```bash
cp .env.example .env      # then edit the values
docker compose up --build
```

- Frontend: <http://localhost:8080>
- Backend health: <http://localhost:3000/health>

Compose builds both images, waits for the backend healthcheck to pass, then
starts the frontend.

## Environment variables

### Backend (runtime)

| Variable                   | Required | Default                 | Description                                                                                                 |
| -------------------------- | -------- | ----------------------- | ----------------------------------------------------------------------------------------------------------- |
| `NODE_ENV`                 | no       | `development`           | Set to `production` in deployment.                                                                          |
| `PORT`                     | no       | `3000`                  | Port the API listens on (also used by the container healthcheck).                                           |
| `CORS_ORIGINS`             | **yes**  | `http://localhost:5173` | Comma-separated allowlist of browser origins. Must include the frontend's public origin. No wildcard.       |
| `TRUST_PROXY`              | no       | `false`                 | Express `trust proxy`. `false`, a hop count (e.g. `1`), or a subnet allowlist. **Never `true`.** See below. |
| `RATE_LIMIT_WINDOW_MS`     | no       | `900000` (15 min)       | Rate-limit window length in ms.                                                                             |
| `RATE_LIMIT_MAX`           | no       | `100`                   | Max requests per client IP per window.                                                                      |
| `YAHOO_REQUEST_TIMEOUT_MS` | no       | `10000`                 | Timeout for a single upstream Yahoo Finance request.                                                        |

Configuration is validated at startup (`backend/src/config/env.ts`); invalid
values fail fast and the process exits with a non-zero code.

### Frontend (build-time)

| Variable            | Required | Default                 | Description                                                                                           |
| ------------------- | -------- | ----------------------- | ----------------------------------------------------------------------------------------------------- |
| `VITE_API_BASE_URL` | **yes**  | `http://localhost:3000` | Origin the browser uses to reach the backend. **Inlined into the bundle at build time**, not runtime. |

Because `VITE_*` variables are compiled into the static bundle, changing the API
URL requires **rebuilding** the frontend image. `VITE_*` values are public — never
put a secret in one.

### Compose (host)

`docker-compose.yml` also reads `BACKEND_PORT` (default `3000`) and
`FRONTEND_PORT` (default `8080`) from `.env` to map container ports to the host.

## Production build details

Both Dockerfiles are multi-stage and build from the **repository root** so the
build context includes the workspace root, the lockfile, and the shared package.

- **Backend** — a build stage runs `npm ci` (with dev deps) and compiles the
  shared package and backend to JavaScript. The runtime stage installs only
  production dependencies for the `shared` and `backend` workspaces
  (`npm ci --omit=dev`), copies the compiled `dist` output, drops to the
  unprivileged `node` user, and runs `node backend/dist/index.js`.
- **Frontend** — a build stage compiles the shared package and runs
  `vite build`; the runtime stage serves the static output with nginx using
  `frontend/nginx.conf` (static files with an SPA fallback to `index.html`).

Build images manually (from the repo root) if not using Compose:

```bash
docker build -f backend/Dockerfile -t prometheus-backend .
docker build -f frontend/Dockerfile \
  --build-arg VITE_API_BASE_URL=https://api.example.com \
  -t prometheus-frontend .
```

## CORS and API URL

`VITE_API_BASE_URL` (frontend) and `CORS_ORIGINS` (backend) are two sides of the
same cross-origin relationship and must agree:

- `VITE_API_BASE_URL` = where the browser sends API requests → the backend's
  public origin (e.g. `https://api.example.com`).
- `CORS_ORIGINS` = which origins the backend permits → the frontend's public
  origin (e.g. `https://app.example.com`). Multiple origins are comma-separated.

An empty/omitted `CORS_ORIGINS` denies all cross-origin browser requests; there
is no wildcard fallback.

## Rate limiting and trusted proxy behavior

Rate limiting is **per client IP**, keyed on the IP Express derives from its
`trust proxy` setting.

- **Default (`TRUST_PROXY=false`)** — Express uses the direct socket address.
  This is correct when clients connect straight to the backend (as in the
  Compose topology above), and `X-Forwarded-For` cannot be used to spoof an IP.
- **Behind a reverse proxy / load balancer** — set `TRUST_PROXY` to the **exact
  number of trusted hops** in front of the backend (e.g. `1` for a single
  proxy), or to a subnet allowlist (e.g. `10.0.0.0/8`). Express then reads the
  real client IP from `X-Forwarded-For`.

> **Never set `TRUST_PROXY=true`.** Trusting every proxy lets any client forge
> an `X-Forwarded-For` header, spoof its source IP, and evade the rate limiter.
> The app rejects `true` at startup for this reason.

## Health checks

The backend exposes `GET /health`, returning `{"status":"ok"}`. Both images
define a Docker `HEALTHCHECK`:

- **backend** — probes `http://127.0.0.1:$PORT/health` via Node's built-in
  `fetch` (no extra tooling in the image).
- **frontend** — `wget --spider` against nginx on port 80.

Compose uses the backend's health status to gate frontend startup
(`depends_on: condition: service_healthy`). For orchestrators (Kubernetes,
ECS), point liveness/readiness probes at `/health`.

## Scaling considerations

The rate limiter uses an **in-memory store**, which is correct for a
**single backend instance** only. Each instance would track its own counters, so
running multiple backend replicas would let a client exceed the intended global
limit (roughly N× the limit across N instances).

Before scaling the backend horizontally, replace the in-memory store with a
shared one (e.g. Redis via `rate-limit-redis`) so limits are enforced across all
instances. When adding a load balancer in front of the backend, also set
`TRUST_PROXY` appropriately (see above) so the real client IP — not the load
balancer's — is used for limiting.

## Security notes

- Only `.env.example` files are committed; real `.env` files are git-ignored and
  are never copied into images (`.dockerignore`).
- The backend sets security headers via Helmet and never exposes internal error
  detail: 5xx responses return a generic message while the real cause is logged
  server-side with the request ID.
- User-supplied stock symbols are validated against a strict allowlist before
  being used to build the outbound Yahoo Finance URL (SSRF protection).
- The backend runs as a non-root user; request bodies are capped at 10 KB.
