/**
 * Presentation-layer formatting helpers shared by the results table and chart so
 * numbers and dates render identically across both views.
 */

// A fixed UTC formatter. The trading `day` is an America/New_York calendar date
// (YYYY-MM-DD) with no time component; formatting it in UTC keeps the label
// consistent and guarantees the represented day never shifts to the browser's
// local time zone.
const tradingDayFormatter = new Intl.DateTimeFormat('en-US', {
  year: 'numeric',
  month: 'short',
  day: 'numeric',
  timeZone: 'UTC',
})

// Averages are rounded to four decimals by the backend; render exactly four.
const priceFormatter = new Intl.NumberFormat('en-US', {
  minimumFractionDigits: 4,
  maximumFractionDigits: 4,
})

// Volume is an integer; group thousands for readability.
const volumeFormatter = new Intl.NumberFormat('en-US', {
  maximumFractionDigits: 0,
})

/**
 * Formats an ISO `YYYY-MM-DD` trading day for display (e.g. `May 13, 2024`)
 * without ever converting it to the browser's local time zone.
 */
export function formatTradingDay(day: string): string {
  const parsed = new Date(`${day}T00:00:00Z`)
  if (Number.isNaN(parsed.getTime())) {
    // Fall back to the raw ISO value rather than rendering "Invalid Date".
    return day
  }
  return tradingDayFormatter.format(parsed)
}

/** Formats a price average to exactly four decimal places. */
export function formatPrice(value: number): string {
  return `$${priceFormatter.format(value)}`
}

/** Formats a volume as a grouped integer (e.g. `12,345,678`). */
export function formatVolume(value: number): string {
  return volumeFormatter.format(value)
}
