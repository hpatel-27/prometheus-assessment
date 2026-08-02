# Stock Market MVP

A small full-stack application that retrieves intraday stock-market data from
Yahoo Finance and presents it as per-day aggregates grouped by the
**America/New_York** trading day.

- **backend/** — Node.js + TypeScript + Express API.
- **frontend/** — React + TypeScript client (Vite, Tailwind, TanStack Query).
- **shared/** — Zod schemas and the TypeScript types inferred from them, the
  single source of truth for the API contract consumed by both sides.

The frontend talks only to the backend; it never calls Yahoo Finance directly.

## Prerequisites

- **Node.js ≥ 20.11** (the repo uses built-in `fetch` and modern ESM).
- **npm ≥ 10** (ships with Node 20.11+). This project uses **npm workspaces** —
  do not use pnpm, Yarn, or Bun.

Check your versions:

```bash
node --version
npm --version
```

## Setup

Install all workspace dependencies from the repository root (one command installs
`shared`, `backend`, and `frontend`):

```bash
npm install
```

No `.env` file is required to run locally — sensible defaults are built in (see
[Configuration](#configuration)). Copy the examples only if you need to override
them.

## Run locally with Docker (production)

Quick start (Docker Compose)

Note: Make sure Docker is running on your machine

```bash
cp .env.example .env      # then edit the values
docker compose up --build
```

- Frontend: <http://localhost:8080>
- Backend health: <http://localhost:3000/health>

Compose builds both images, waits for the backend healthcheck to pass, then
starts the frontend.

## Run locally (development)

From the repository root:

```bash
npm run dev
```

This builds `shared` once, then starts three watchers concurrently:

| Process    | URL                     | Notes                                   |
| ---------- | ----------------------- | --------------------------------------- |
| `shared`   | —                       | Rebuilds schemas/types on change.       |
| `backend`  | <http://localhost:3000> | Express API (`tsx watch`).              |
| `frontend` | <http://localhost:5173> | Vite dev server with hot module reload. |

Open <http://localhost:5173> and search for a symbol (e.g. `AAPL`). The default
backend CORS allowlist already permits the Vite dev origin, so the two talk to
each other out of the box.

### Running a workspace on its own

```bash
# API only — build shared first: npm run build -w @prometheus/shared
npm run dev -w backend
# Client only — expects a backend at VITE_API_BASE_URL
npm run dev -w frontend
```

## Configuration

All variables have working defaults for local development. To override, copy the
example file in each workspace and edit it (`.env` files are git-ignored).

**Backend** (`backend/.env`, see `backend/.env.example`)

| Variable                   | Default                 | Description                                                                   |
| -------------------------- | ----------------------- | ----------------------------------------------------------------------------- |
| `PORT`                     | `3000`                  | API port.                                                                     |
| `CORS_ORIGINS`             | `http://localhost:5173` | Comma-separated browser origins allowed by CORS.                              |
| `RATE_LIMIT_WINDOW_MS`     | `900000`                | Rate-limit window (ms). Limiting is per client IP.                            |
| `RATE_LIMIT_MAX`           | `100`                   | Max requests per IP per window.                                               |
| `YAHOO_REQUEST_TIMEOUT_MS` | `10000`                 | Upstream request timeout (ms).                                                |
| `TRUST_PROXY`              | `false`                 | Set to the proxy hop count only behind a trusted reverse proxy. Never `true`. |

**Frontend** (`frontend/.env`, see `frontend/.env.example`)

| Variable            | Default                 | Description                                                   |
| ------------------- | ----------------------- | ------------------------------------------------------------- |
| `VITE_API_BASE_URL` | `http://localhost:3000` | Backend origin. `VITE_*` vars are public and build-time only. |

## Production build

Build every workspace (type-check + compile backend, bundle frontend):

```bash
npm run build
```

Run the compiled backend and preview the built frontend:

```bash
npm run start -w backend      # serves the API from backend/dist
npm run preview -w frontend   # serves the built SPA from frontend/dist
```

For containerized deployment (Docker images + Compose), see
[DEPLOYMENT.md](./DEPLOYMENT.md).

## Useful scripts (run from the root)

| Command                | Description                                    |
| ---------------------- | ---------------------------------------------- |
| `npm run dev`          | Start shared/backend/frontend in watch mode.   |
| `npm run build`        | Build all workspaces.                          |
| `npm run typecheck`    | Strict TypeScript check across all workspaces. |
| `npm run lint`         | ESLint across all workspaces.                  |
| `npm run format`       | Format the repo with Prettier.                 |
| `npm run format:check` | Verify formatting without writing changes.     |

## API

The backend exposes `GET /api/stocks/:symbol` and `GET /health`. The full
request/response contract, error shapes, and request flow are documented in
[backend/README.md](./backend/README.md).

> Any example values in the docs are illustrative, synthetic samples that show
> response _shape_ only — not real market data.

## Notes

This project was built with AI assistance (ChatGPT to build out the prompts, Claude Code to implement the project). Project-wide conventions and
architectural rules are documented in [CLAUDE.md](./CLAUDE.md).
