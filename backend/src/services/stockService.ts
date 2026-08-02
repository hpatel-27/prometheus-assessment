import type { StockDailyResponse } from '@prometheus/shared'
import { fetchYahooChart } from '../clients/yahooFinanceClient.js'
import { aggregateDailyData } from './stockAggregation.js'
import { normalizeYahooChart } from './stockNormalization.js'

/**
 * Application service that produces a symbol's daily market-data aggregates.
 *
 * It orchestrates the full transformation pipeline:
 *
 *   validate symbol  (at the Yahoo client boundary)
 *     → query Yahoo Finance for ~1 month of 15-minute intraday data
 *     → normalize the upstream response into internal observations, each tagged
 *       with its America/New_York trading day
 *     → group by New York calendar day and calculate daily aggregates
 *     → validate the result against the shared Zod schema (done inside
 *       {@link aggregateDailyData})
 *     → return the inferred shared type
 *
 * The return type is the shared, schema-derived {@link StockDailyResponse}; this
 * service intentionally declares no duplicate response interface. It is also
 * free of Express/HTTP concerns — it never touches request/response objects and
 * surfaces failures as the application error types thrown by the client, which
 * the centralized error middleware translates into HTTP responses.
 *
 * @param symbol - A stock symbol. It is (re)validated and normalized at the
 *   Yahoo client boundary before use, so callers may pass already-validated
 *   input without risk of it reaching the outbound request untrusted.
 * @returns The ordered per-day aggregates for the symbol (possibly empty when
 *   the symbol has no data in the requested window).
 */
export async function getDailyStockData(symbol: string): Promise<StockDailyResponse> {
  const chart = await fetchYahooChart(symbol)
  const observations = normalizeYahooChart(chart)
  return aggregateDailyData(observations)
}
