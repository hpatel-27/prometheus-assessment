import { randomUUID } from 'node:crypto'
import type { NextFunction, Request, Response } from 'express'

export const REQUEST_ID_HEADER = 'X-Request-Id'

/**
 * Assigns a UUID to every incoming request. The ID is stored on res.locals so
 * downstream middleware and error handlers can include it in logs and responses,
 * and it is returned to the client via the X-Request-Id response header.
 */
export function requestIdMiddleware(_req: Request, res: Response, next: NextFunction): void {
  const id = randomUUID()
  res.locals['requestId'] = id
  res.setHeader(REQUEST_ID_HEADER, id)
  next()
}
