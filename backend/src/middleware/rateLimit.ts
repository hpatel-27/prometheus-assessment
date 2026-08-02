import { rateLimit } from 'express-rate-limit'
import { env } from '../config/env.js'
import { TooManyRequestsError } from '../errors/HttpError.js'

/**
 * IP-based rate limiter applied globally before route handlers.
 *
 * Uses an in-memory store, which is appropriate for a single-instance
 * deployment. If the backend is later horizontally scaled, replace the default
 * store with a shared implementation (e.g. Redis) to enforce limits across
 * all instances.
 *
 * Clients are keyed on the direct socket address (Express `trust proxy` is left
 * at its default of disabled), so `X-Forwarded-For` cannot be used to spoof a
 * source IP and evade the limiter. If the app is later deployed behind a trusted
 * reverse proxy, configure `trust proxy` to the real hop count so the client IP
 * is read correctly.
 */
export const rateLimitMiddleware = rateLimit({
  windowMs: env.RATE_LIMIT_WINDOW_MS,
  limit: env.RATE_LIMIT_MAX,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  handler(_req, _res, next) {
    next(new TooManyRequestsError('Too many requests, please try again later.'))
  },
})
