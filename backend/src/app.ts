import cors from 'cors'
import express from 'express'
import type { Application } from 'express'
import helmet from 'helmet'
import { env } from './config/env.js'
import { errorHandler } from './middleware/errorHandler.js'
import { rateLimitMiddleware } from './middleware/rateLimit.js'
import { requestIdMiddleware } from './middleware/requestId.js'
import healthRouter from './routes/health.js'
import stocksRouter from './routes/stocks.js'

/**
 * Constructs and configures the Express application without binding to a port.
 * Keeping app construction separate from server startup allows the app to be
 * imported in contexts that must not open a network connection.
 */
export function createApp(): Application {
  const app = express()

  // Trust proxy controls how Express derives the client IP (used to key the
  // rate limiter) from `X-Forwarded-For`. Disabled by default; when running
  // behind a trusted reverse proxy set TRUST_PROXY to the exact hop count. It
  // is never `true` (see config/env.ts) so a client cannot forge its source IP.
  app.set('trust proxy', env.TRUST_PROXY)

  // Security headers. Helmet sets sensible defaults (CSP, X-Frame-Options,
  // etc.) and disables the X-Powered-By header.
  app.use(helmet())

  // Explicit CORS allowlist — origins come from validated environment config
  // so a wildcard cannot accidentally leak into production.
  app.use(cors({ origin: env.CORS_ORIGINS }))

  // Attach a request ID before rate limiting and error handling so it is
  // available throughout the request lifecycle.
  app.use(requestIdMiddleware)

  // Global IP-based rate limiter applied before route handlers.
  app.use(rateLimitMiddleware)

  // Parse JSON request bodies with a small explicit cap. No current route
  // consumes a body, so this bounds request-body memory usage and rejects
  // oversized payloads early rather than relying on the 100kb default.
  app.use(express.json({ limit: '10kb' }))

  // Routes
  app.use(healthRouter)
  app.use(stocksRouter)

  // Centralized error handler must be the last middleware registered.
  app.use(errorHandler)

  return app
}
