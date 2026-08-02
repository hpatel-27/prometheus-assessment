# Frontend

React + TypeScript client for the stock market MVP, built with Vite.

The client consumes only the backend API — it never calls Yahoo Finance
directly. Shared API contracts (Zod schemas and inferred types) come from
`@prometheus/shared`.

## Stack

- **React + TypeScript** (Vite)
- **Tailwind CSS** for styling (via `@tailwindcss/vite`)
- **TanStack Query** for server state
- **Sonner** for transient notifications

## Configuration

Client configuration is validated in `src/config/env.ts`. Only `VITE_`-prefixed
variables are exposed by Vite.

| Variable            | Default                 | Description                |
| ------------------- | ----------------------- | -------------------------- |
| `VITE_API_BASE_URL` | `http://localhost:3000` | Origin of the backend API. |

Copy `.env.example` to `.env` (or `.env.local`) to override locally.

## Scripts

```bash
npm run dev -w frontend        # start the Vite dev server
npm run build -w frontend      # type-check and build for production
npm run typecheck -w frontend  # tsc project references
npm run lint -w frontend       # eslint
```

## Structure

```
src/
├── components/   presentational UI (header, search, results)
├── config/       validated runtime configuration
├── App.tsx       application shell
└── main.tsx      providers (QueryClient, Sonner) and root render
```
