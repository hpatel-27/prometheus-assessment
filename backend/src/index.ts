import { env } from './config/env.js'

/**
 * Application bootstrap (Express server, routes, middleware) is implemented in a
 * later commit. For now we only validate configuration, which exercises the
 * build/typecheck toolchain end to end.
 */
console.info(`[backend] scaffold ready (env: ${env.NODE_ENV}, port: ${env.PORT})`)
