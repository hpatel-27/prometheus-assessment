import type { StockDailyData } from '@prometheus/shared'
import { formatPrice, formatTradingDay, formatVolume } from '../lib/format'

interface StockResultsTableProps {
  /** Ordered per-day aggregates to display. Assumed non-empty by the caller. */
  days: StockDailyData[]
  /** Symbol the data belongs to, used for the accessible caption. */
  symbol: string
}

/**
 * Responsive, accessible table of daily aggregates.
 *
 * Purely presentational: it renders the shared {@link StockDailyData} it is
 * given and holds no fetching or state logic. The `day` is rendered via a
 * fixed-UTC formatter (see {@link formatTradingDay}) so the New York trading day
 * is never shifted into the browser's local time zone.
 */
export function StockResultsTable({ days, symbol }: StockResultsTableProps) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-sm">
        <caption className="sr-only">Daily aggregates for {symbol}</caption>
        <thead>
          <tr className="border-b border-slate-200 text-slate-500">
            <th scope="col" className="px-4 py-2 text-left font-medium">
              Day
            </th>
            <th scope="col" className="px-4 py-2 text-right font-medium">
              Average Low
            </th>
            <th scope="col" className="px-4 py-2 text-right font-medium">
              Average High
            </th>
            <th scope="col" className="px-4 py-2 text-right font-medium">
              Volume
            </th>
          </tr>
        </thead>
        <tbody>
          {days.map((day) => (
            <tr key={day.day} className="border-b border-slate-100 last:border-0">
              <th
                scope="row"
                className="px-4 py-2 text-left font-normal whitespace-nowrap text-slate-800"
              >
                {/* Machine-readable ISO date; visible text is the UTC-formatted label. */}
                <time dateTime={day.day}>{formatTradingDay(day.day)}</time>
              </th>
              <td className="px-4 py-2 text-right whitespace-nowrap text-slate-800 tabular-nums">
                {formatPrice(day.lowAverage)}
              </td>
              <td className="px-4 py-2 text-right whitespace-nowrap text-slate-800 tabular-nums">
                {formatPrice(day.highAverage)}
              </td>
              <td className="px-4 py-2 text-right whitespace-nowrap text-slate-800 tabular-nums">
                {formatVolume(day.volume)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
