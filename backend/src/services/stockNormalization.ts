import type { TradingDay } from '@prometheus/shared'
import type { YahooChartResult } from '../clients/yahooChartSchema.js'

/**
 * A single 15-minute intraday observation, lifted out of Yahoo's parallel
 * arrays into a self-describing record and tagged with the New York trading day
 * it belongs to.
 *
 * Each price/volume field is independently nullable: Yahoo reports `null` for a
 * bucket with no trades, and a bucket may be missing one field while still
 * carrying the others. Aggregation therefore filters each field separately so a
 * gap in one series never discards the values present in the others.
 */
export interface NormalizedObservation {
  /** Original Yahoo timestamp, as an epoch-seconds UTC instant. */
  timestamp: number
  /** America/New_York calendar day (`YYYY-MM-DD`) for {@link timestamp}. */
  day: TradingDay
  low: number | null
  high: number | null
  volume: number | null
}

/**
 * Formatter that renders an instant as its America/New_York calendar date.
 *
 * The API's `day` is the US market's Eastern-Time *trading* date, not a UTC
 * date. For example an observation at `2024-03-10T01:30:00Z` occurred at
 * 20:30 the previous evening in New York and therefore belongs to that earlier
 * trading day. We rely on the IANA `America/New_York` zone — a real timezone
 * database that applies the correct DST offset (EST vs. EDT) for each instant —
 * rather than a fixed UTC-5 offset, which would misclassify observations for the
 * roughly half of the year that Eastern Daylight Time is in effect. Getting this
 * wrong would assign 15-minute buckets near midnight to the wrong day and
 * corrupt the daily aggregates.
 */
const NEW_YORK_DAY_FORMATTER = new Intl.DateTimeFormat('en-US', {
  timeZone: 'America/New_York',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
})

/**
 * Converts an epoch-seconds instant to its America/New_York calendar day as an
 * ISO `YYYY-MM-DD` string. `formatToParts` is used so the ISO date is assembled
 * explicitly from the year/month/day parts, independent of locale-specific
 * ordering or separators.
 */
function toNewYorkTradingDay(epochSeconds: number): TradingDay {
  const parts = NEW_YORK_DAY_FORMATTER.formatToParts(new Date(epochSeconds * 1000))
  const partValue = (type: Intl.DateTimeFormatPartTypes): string =>
    parts.find((part) => part.type === type)?.value ?? ''
  return `${partValue('year')}-${partValue('month')}-${partValue('day')}`
}

/**
 * Transforms a validated Yahoo chart result into the normalized internal
 * representation the rest of the backend operates on.
 *
 * Timestamps drive the iteration: for each instant we pair up the low/high/
 * volume at the same index (treating a missing or `null` entry as `null`) and
 * tag it with its New York trading day. Datapoints without a timestamp are
 * skipped because they cannot be assigned to a trading day.
 *
 * This transformation is deliberately independent of Express and of Yahoo's
 * response shape leaking any further: it consumes the upstream contract and
 * emits {@link NormalizedObservation}s only.
 */
export function normalizeYahooChart(result: YahooChartResult): NormalizedObservation[] {
  const timestamps = result.timestamp ?? []
  // A well-formed response carries exactly one quote block; a missing block is
  // treated as all-null series rather than an error.
  const quote = result.indicators.quote[0]
  const lows = quote?.low ?? []
  const highs = quote?.high ?? []
  const volumes = quote?.volume ?? []

  const observations: NormalizedObservation[] = []

  for (let index = 0; index < timestamps.length; index += 1) {
    const timestamp = timestamps[index]
    if (timestamp === undefined) {
      continue
    }

    observations.push({
      timestamp,
      day: toNewYorkTradingDay(timestamp),
      // `?? null` collapses both an out-of-range index and Yahoo's own `null`
      // into a single "missing" representation.
      low: lows[index] ?? null,
      high: highs[index] ?? null,
      volume: volumes[index] ?? null,
    })
  }

  return observations
}
