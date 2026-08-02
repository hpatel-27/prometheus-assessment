import { stockSymbolSchema } from '@prometheus/shared'
import type { NextFunction, Request, Response } from 'express'
import { BadRequestError } from '../errors/HttpError.js'
import { getDailyStockData } from '../services/stockService.js'

/**
 * Handles `GET /api/stocks/:symbol`, returning the shared daily-aggregate
 * response for a stock symbol.
 *
 * The controller is deliberately thin: it validates and normalizes the route
 * parameter with the shared {@link stockSymbolSchema}, invokes the stock
 * service, and serializes the shared response shape. It contains no business
 * logic and does not know Yahoo Finance exists.
 *
 * Errors are forwarded to the centralized error middleware via `next`, since an
 * async handler's rejection is not caught by Express automatically. Validation
 * failures become a {@link BadRequestError} (400); service-layer failures
 * propagate as their own application error types.
 */
export async function getStockDailyData(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const parsed = stockSymbolSchema.safeParse(req.params['symbol'])
    if (!parsed.success) {
      throw new BadRequestError(
        parsed.error.issues[0]?.message ?? 'A valid stock symbol is required.',
      )
    }

    const data = await getDailyStockData(parsed.data)
    res.json(data)
  } catch (error) {
    next(error)
  }
}
