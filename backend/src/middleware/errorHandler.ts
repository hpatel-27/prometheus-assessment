import type { NextFunction, Request, Response } from 'express'
import { HttpError } from '../errors/HttpError.js'

/**
 * Centralized Express error handler.
 *
 * Known HttpErrors produce their designated status code and message. All other
 * thrown values produce a safe 500 so stack traces and implementation details
 * are never sent to the client.
 *
 * The four-parameter signature is required for Express to recognize this
 * function as an error handler rather than a route handler.
 */
export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  const requestId = res.locals['requestId'] as string | undefined

  if (err instanceof HttpError) {
    res.status(err.statusCode).json({ error: err.message, requestId })
    return
  }

  console.error('[backend] unhandled error', { requestId, err })
  res.status(500).json({ error: 'An unexpected error occurred.', requestId })
}
