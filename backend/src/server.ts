import { createApp } from './app.js'
import { env } from './config/env.js'

/**
 * Starts the HTTP server.
 */
export function startServer(): void {
  const app = createApp()

  app.listen(env.PORT, () => {
    console.info(`[backend] server listening on port ${env.PORT} (${env.NODE_ENV})`)
  })
}
