import { z } from 'zod'

/**
 * Shared API contracts for the stock market MVP.
 *
 * Convention (enforced across the whole project): every shape that crosses the
 * frontend/backend boundary is defined here as a Zod schema FIRST, and its
 * TypeScript type is derived with `z.infer`. The schema is the single source of
 * truth for both runtime validation and static types — never hand-write a
 * duplicate `interface`/`type` for these contracts in the backend or frontend.
 */

/** Maximum length accepted for a normalized stock symbol. */
export const STOCK_SYMBOL_MAX_LENGTH = 10

/**
 * Symbols are restricted to an explicit allowlist of characters. Beyond basic
 * input hygiene this is a security control: the symbol is later interpolated
 * into the upstream Yahoo Finance request URL, so forbidding characters such as
 * `/`, `:`, `?` and whitespace prevents path/URL injection and SSRF. Separators
 * (`.` or `-`, e.g. `BRK.B` / `BRK-B`) are permitted only between alphanumeric
 * runs, so a symbol can neither start/end with a separator nor contain a run of
 * them.
 */
const STOCK_SYMBOL_PATTERN = /^[A-Z0-9]+(?:[.-][A-Z0-9]+)*$/

/**
 * User-controlled stock symbol input.
 *
 * Normalization happens before validation: surrounding whitespace is trimmed
 * and the value is upper-cased, so `  aapl ` and `AAPL` are treated as the same
 * symbol. The normalized value is then checked against the length bounds and
 * the character allowlist. The inferred `StockSymbol` type is therefore always
 * the trimmed, upper-cased form.
 */
export const stockSymbolSchema = z
  .string({
    required_error: 'A stock symbol is required.',
    invalid_type_error: 'A stock symbol must be a string.',
  })
  .trim()
  .toUpperCase()
  .min(1, 'A stock symbol is required.')
  .max(
    STOCK_SYMBOL_MAX_LENGTH,
    `A stock symbol must be at most ${STOCK_SYMBOL_MAX_LENGTH} characters.`,
  )
  .regex(
    STOCK_SYMBOL_PATTERN,
    'A stock symbol may only contain letters, digits, and single "." or "-" separators.',
  )

export type StockSymbol = z.infer<typeof stockSymbolSchema>

const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/

/**
 * Confirms an ISO date string denotes a real calendar date (rejecting values
 * such as `2009-02-30`). Uses UTC construction purely as a calendar calculator
 * and round-trips the components back out — no local timezone is involved, so
 * this never shifts the represented day.
 */
function isRealCalendarDate(value: string): boolean {
  const [yearPart, monthPart, dayPart] = value.split('-')
  const year = Number(yearPart)
  const month = Number(monthPart)
  const day = Number(dayPart)

  const utc = new Date(Date.UTC(year, month - 1, day))
  return (
    utc.getUTCFullYear() === year && utc.getUTCMonth() === month - 1 && utc.getUTCDate() === day
  )
}

/**
 * A trading day expressed as an ISO `YYYY-MM-DD` calendar date.
 *
 * This is the America/New_York calendar date that the underlying market data
 * belongs to (the backend derives it during aggregation). It is a bare date
 * label with no time or timezone component, so this schema validates only the
 * textual format and that the value is a real calendar date. It deliberately
 * performs no timezone conversion, which would risk changing the trading day
 * the value represents.
 */
export const tradingDaySchema = z
  .string()
  .regex(ISO_DATE_PATTERN, 'Day must be an ISO date in YYYY-MM-DD format.')
  .refine(isRealCalendarDate, 'Day must be a valid calendar date.')

export type TradingDay = z.infer<typeof tradingDaySchema>

/**
 * Aggregated market data for a single New York trading day.
 *
 * - `lowAverage` / `highAverage` are the arithmetic means of that day's valid
 *   intraday low/high observations, rounded to four decimal places by the
 *   backend for the API representation. They are finite and non-negative
 *   (prices cannot be negative).
 * - `volume` is the sum of that day's valid intraday volumes and remains an
 *   integer.
 *
 * No cross-field invariant (e.g. `highAverage >= lowAverage`) is enforced:
 * because missing observations are handled per field, the two averages can be
 * drawn from slightly different observation sets, so such a constraint could
 * wrongly reject otherwise valid data.
 */
export const stockDailyDataSchema = z.object({
  day: tradingDaySchema,
  lowAverage: z.number().finite().nonnegative(),
  highAverage: z.number().finite().nonnegative(),
  volume: z.number().int().nonnegative(),
})

export type StockDailyData = z.infer<typeof stockDailyDataSchema>

/**
 * The complete daily response for a symbol: an ordered list of per-day
 * aggregates. May be empty when a symbol has no market data in the requested
 * window.
 */
export const stockDailyResponseSchema = z.array(stockDailyDataSchema)

export type StockDailyResponse = z.infer<typeof stockDailyResponseSchema>

/**
 * Request parameters for fetching a symbol's daily aggregates. The backend
 * parses untrusted request input (path/query params) with this schema; the
 * frontend uses it to build well-formed requests. The `symbol` is normalized
 * and validated by {@link stockSymbolSchema}.
 */
export const stockDataRequestSchema = z.object({
  symbol: stockSymbolSchema,
})

export type StockDataRequest = z.infer<typeof stockDataRequestSchema>
