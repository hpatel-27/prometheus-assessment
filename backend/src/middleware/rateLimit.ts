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
 * Accurate IP resolution depends on the trust proxy configuration. Set
 * TRUST_PROXY to the number of real proxy hops in front of this server so
 * Express reads the client IP from X-Forwarded-For correctly.
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
