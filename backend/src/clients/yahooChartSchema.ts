import { z } from 'zod'

/**
 * Zod schemas describing the *untrusted* Yahoo Finance chart response.
 *
 * Yahoo is an external system whose contract we do not control, so its payload
 * is validated here at the boundary before any of it is used. These schemas
 * model only the subset the application depends on, and — together with the
 * client and normalization layer — form an anti-corruption boundary: Yahoo's
 * response shape must not travel any further into the app, which operates on the
 * normalized internal representation instead.
 *
 * The shapes are intentionally permissive about *presence*, not *type*:
 *  - intraday arrays may be absent (a symbol with no data in the window), and
 *  - individual entries may be `null` (a 15-minute bucket with no trades).
 *
 * Note that `z.number()` accepts `NaN`/`Infinity`; per-value numeric sanity
 * (finiteness) is enforced later during aggregation rather than rejecting an
 * entire upstream payload over one bad bucket.
 */

/**
 * A single intraday OHLCV series. Only the fields the app consumes are modeled.
 * Each series may be absent, and each entry may be `null`, so both are optional
 * and nullable respectively.
 */
const yahooQuoteSchema = z.object({
  high: z.array(z.number().nullable()).optional(),
  low: z.array(z.number().nullable()).optional(),
  volume: z.array(z.number().nullable()).optional(),
})

/**
 * Error payload Yahoo returns for unknown/delisted symbols. It accompanies an
 * HTTP 4xx and a null `result`, e.g. `{ code: "Not Found", description: "..." }`.
 */
export const yahooChartErrorSchema = z.object({
  code: z.string(),
  description: z.string(),
})

export type YahooChartError = z.infer<typeof yahooChartErrorSchema>

/**
 * One chart result entry: the intraday series for the requested symbol. Yahoo
 * nests the OHLCV arrays one level deep under `indicators.quote`. `timestamp`
 * holds epoch-seconds instants parallel to the quote arrays and is absent when
 * no data is available.
 */
export const yahooChartResultSchema = z.object({
  timestamp: z.array(z.number()).optional(),
  indicators: z.object({
    quote: z.array(yahooQuoteSchema),
  }),
})

export type YahooChartResult = z.infer<typeof yahooChartResultSchema>

/**
 * Top-level envelope. Exactly one of `result` / `error` is populated: `result`
 * on success, `error` for an unknown symbol. Both are optional/nullable so the
 * client can distinguish the cases explicitly rather than assuming a shape.
 */
export const yahooChartResponseSchema = z.object({
  chart: z.object({
    result: z.array(yahooChartResultSchema).nullable().optional(),
    error: yahooChartErrorSchema.nullable().optional(),
  }),
})

export type YahooChartResponse = z.infer<typeof yahooChartResponseSchema>
