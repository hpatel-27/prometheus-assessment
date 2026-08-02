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
})

export type Env = z.infer<typeof envSchema>

const parsed = envSchema.safeParse(process.env)

if (!parsed.success) {
  // Fail fast on misconfiguration rather than starting in an undefined state.
  console.error('Invalid environment configuration:', parsed.error.issues)
  process.exit(1)
}

export const env: Env = parsed.data
