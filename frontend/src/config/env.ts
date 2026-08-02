import { z } from 'zod'

/**
 * Frontend runtime configuration.
 *
 * Vite only exposes variables prefixed with `VITE_` to client code via
 * `import.meta.env`. We validate that surface once here so the rest of the app
 * can rely on a well-typed, present value instead of reading `import.meta.env`
 * (whose members are `string | undefined`) throughout the codebase.
 *
 * `VITE_API_BASE_URL` is the origin of the backend API. The frontend talks only
 * to this backend and never to Yahoo Finance directly.
 */
const envSchema = z.object({
  // Default to the local backend dev server so a fresh checkout runs without a
  // `.env` file. Trailing slashes are trimmed so callers can safely build paths
  // as `${API_BASE_URL}/api/...`.
  VITE_API_BASE_URL: z
    .string()
    .url('VITE_API_BASE_URL must be a valid URL.')
    .default('http://localhost:3000')
    .transform((value) => value.replace(/\/+$/, '')),
})

const parsed = envSchema.safeParse(import.meta.env)

if (!parsed.success) {
  // Fail fast during development/build rather than issuing requests to an
  // undefined or malformed backend origin.
  console.error('Invalid frontend environment configuration:', parsed.error.issues)
  throw new Error('Invalid frontend environment configuration.')
}

export const env = parsed.data

/** Base origin of the backend API, without a trailing slash. */
export const API_BASE_URL = env.VITE_API_BASE_URL
