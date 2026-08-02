import 'dotenv/config'
import { z } from 'zod'

/**
 * Environment configuration is validated once at startup so the rest of the
 * application can rely on well-typed, present values instead of reaching into
 * `process.env` (which is `string | undefined`) throughout the codebase.
 */
const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(3000),
  // Split into a list at the boundary so callers receive a ready-to-use array.
  CORS_ORIGINS: z
    .string()
    .default('http://localhost:5173')
    .transform((value) =>
      value
        .split(',')
        .map((origin) => origin.trim())
        .filter((origin) => origin.length > 0),
    ),
  // Rate-limit window in milliseconds. Default: 15 minutes.
  RATE_LIMIT_WINDOW_MS: z.coerce
    .number()
    .int()
    .positive()
    .default(15 * 60 * 1000),
  // Maximum requests per IP within the window. Default: 100.
  RATE_LIMIT_MAX: z.coerce.number().int().positive().default(100),
  // Timeout for a single upstream Yahoo Finance request, in milliseconds.
  // Bounds how long a client request can wait on the external provider.
  // Default: 10 seconds.
  YAHOO_REQUEST_TIMEOUT_MS: z.coerce.number().int().positive().default(10_000),
  // Express `trust proxy` setting. Disabled by default so the rate limiter keys
  // on the direct socket address. When the backend runs behind a trusted reverse
  // proxy / load balancer, set this to the exact number of proxy hops so the
  // real client IP is read from `X-Forwarded-For`. See parseTrustProxy for the
  // accepted values and why `true` is rejected.
  TRUST_PROXY: z.string().default('false').transform(parseTrustProxy),
})

/**
 * Parses the `TRUST_PROXY` env var into a value accepted by Express
 * `trust proxy`.
 *
 * Accepts `false`/empty (disabled — key on the direct socket address), a
 * positive integer (number of trusted proxy hops in front of the app), or a
 * comma-separated list of trusted addresses/subnets/presets passed through to
 * Express verbatim (e.g. `loopback`, `10.0.0.0/8`).
 *
 * `true` is deliberately rejected: trusting every proxy lets any client spoof
 * its source IP through a forged `X-Forwarded-For` header and evade IP-based
 * rate limiting.
 */
function parseTrustProxy(raw: string, ctx: z.RefinementCtx): boolean | number | string {
  const value = raw.trim()
  if (value === '' || value.toLowerCase() === 'false') {
    return false
  }
  if (value.toLowerCase() === 'true') {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message:
        'TRUST_PROXY must not be "true" (it lets clients spoof their source IP). Use a hop count (e.g. 1) or a subnet allowlist.',
    })
    return z.NEVER
  }
  if (/^\d+$/.test(value)) {
    return Number(value)
  }
  return value
}

export type Env = z.infer<typeof envSchema>

const parsed = envSchema.safeParse(process.env)

if (!parsed.success) {
  // Fail fast on misconfiguration rather than starting in an undefined state.
  console.error('Invalid environment configuration:', parsed.error.issues)
  process.exit(1)
}

export const env: Env = parsed.data
