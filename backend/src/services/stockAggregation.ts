import {
  stockDailyResponseSchema,
  type StockDailyData,
  type StockDailyResponse,
} from '@prometheus/shared'
import type { NormalizedObservation } from './stockNormalization.js'

/** Decimal places retained for average prices in the API representation. */
const PRICE_AVERAGE_DECIMALS = 4

/** Valid intraday samples for a single trading day, accumulated per field. */
interface DayBuckets {
  lows: number[]
  highs: number[]
  volumes: number[]
}

function roundToDecimals(value: number, decimals: number): number {
  const factor = 10 ** decimals
  return Math.round(value * factor) / factor
}

function mean(values: number[]): number {
  const total = values.reduce((sum, value) => sum + value, 0)
  return total / values.length
}

function sum(values: number[]): number {
  return values.reduce((total, value) => total + value, 0)
}

/**
 * A value contributes to an aggregate only if it is present and finite. `null`
 * marks a bucket with no trades, and although the upstream schema permits
 * `NaN`/`Infinity` (`z.number()` does not reject them), such values would poison
 * an average or sum — so they are filtered out here.
 */
function isUsable(value: number | null): value is number {
  return value !== null && Number.isFinite(value)
}

/**
 * Aggregates normalized 15-minute observations into one record per New York
 * trading day, ordered chronologically.
 *
 * For each America/New_York calendar day:
 *  - `lowAverage`  = arithmetic mean of that day's valid intraday lows,
 *  - `highAverage` = arithmetic mean of that day's valid intraday highs,
 *  - `volume`      = sum of that day's valid intraday volumes.
 *
 * Fields are filtered independently, so a `null`/missing bucket in one series
 * never corrupts the others' aggregates. Averages are computed from the raw
 * observations (no pre-rounding) and only the final averages are rounded, to
 * four decimals; volume is an integer sum. The trading day is taken as-is from
 * normalization — it is already the New York calendar day, never a UTC date.
 *
 * A day with no valid low or high samples cannot produce a meaningful average
 * and is omitted rather than emitted as `NaN`; in practice a real trading day
 * always carries valid price data. An empty volume set legitimately sums to `0`.
 */
export function aggregateDailyData(observations: NormalizedObservation[]): StockDailyResponse {
  const byDay = new Map<string, DayBuckets>()

  for (const observation of observations) {
    let buckets = byDay.get(observation.day)
    if (!buckets) {
      buckets = { lows: [], highs: [], volumes: [] }
      byDay.set(observation.day, buckets)
    }

    if (isUsable(observation.low)) {
      buckets.lows.push(observation.low)
    }
    if (isUsable(observation.high)) {
      buckets.highs.push(observation.high)
    }
    if (isUsable(observation.volume)) {
      buckets.volumes.push(observation.volume)
    }
  }

  const days: StockDailyData[] = []

  for (const [day, buckets] of byDay) {
    if (buckets.lows.length === 0 || buckets.highs.length === 0) {
      continue
    }

    days.push({
      day,
      lowAverage: roundToDecimals(mean(buckets.lows), PRICE_AVERAGE_DECIMALS),
      highAverage: roundToDecimals(mean(buckets.highs), PRICE_AVERAGE_DECIMALS),
      volume: sum(buckets.volumes),
    })
  }

  // ISO `YYYY-MM-DD` strings sort lexicographically in chronological order.
  days.sort((a, b) => a.day.localeCompare(b.day))

  // The aggregated output is a shared API contract, so validate it against the
  // canonical schema before returning — this both guarantees the invariants
  // above and keeps the schema the single source of truth for the shape.
  return stockDailyResponseSchema.parse(days)
}
