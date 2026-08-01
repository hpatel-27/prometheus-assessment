import { SHARED_PACKAGE_NAME } from '@prometheus/shared'

import { env } from './config/env.js'

/**
 * Application bootstrap (Express server, routes, middleware) is implemented in a
 * later commit. For the initial scaffold we only validate configuration and
 * confirm the shared contract package is consumable, which exercises the full
 * build/typecheck toolchain end to end.
 */
console.info(
  `[backend] scaffold ready (env: ${env.NODE_ENV}, port: ${env.PORT}) using ${SHARED_PACKAGE_NAME}`,
)
