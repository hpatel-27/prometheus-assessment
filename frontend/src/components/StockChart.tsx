import type { StockDailyData } from '@prometheus/shared'
import type { ReactNode } from 'react'
import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { formatPrice, formatTradingDay, formatVolume } from '../lib/format'

interface StockChartProps {
  /** Ordered per-day aggregates to plot. Assumed non-empty by the caller. */
  days: StockDailyData[]
  /** Symbol the data belongs to, used for the accessible label. */
  symbol: string
}

const VOLUME_SERIES = 'Volume'

// Compact volume labels keep the secondary axis legible (e.g. `12M`).
const compactVolumeFormatter = new Intl.NumberFormat('en-US', { notation: 'compact' })

// Recharts passes tooltip values/names as broad union types; mirror them so the
// formatters type-check, then narrow to a number for display.
type TooltipValue = number | string | ReadonlyArray<number | string> | undefined
type TooltipName = number | string | undefined

function toNumber(value: TooltipValue): number {
  if (typeof value === 'number') {
    return value
  }
  if (value === undefined) {
    return Number.NaN
  }
  return Number(Array.isArray(value) ? value[0] : value)
}

/**
 * Responsive visualization of a symbol's daily aggregates.
 *
 * Average low/high are drawn as straight (linear) line segments with a marker on
 * every real data point, and volume as bars on a secondary axis. Interpolation
 * is deliberately linear with `connectNulls` disabled so the chart never implies
 * values between — or across gaps in — the actual observations.
 *
 * Purely presentational: it receives already-fetched data and performs no
 * requests, keeping chart concerns separate from data fetching.
 */
export function StockChart({ days, symbol }: StockChartProps) {
  return (
    <figure
      className="m-0"
      // Recharts renders SVG that assistive tech can't meaningfully traverse;
      // expose a concise summary and let the adjacent table convey the values.
      role="img"
      aria-label={`Chart of average low, average high and volume by trading day for ${symbol}.`}
    >
      <ResponsiveContainer width="100%" height={320}>
        <ComposedChart data={days} margin={{ top: 8, right: 8, bottom: 8, left: 8 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
          <XAxis
            dataKey="day"
            tickFormatter={formatTradingDay}
            tick={{ fontSize: 12 }}
            minTickGap={16}
            interval="preserveStartEnd"
          />
          <YAxis
            yAxisId="price"
            tick={{ fontSize: 12 }}
            tickFormatter={(value: number) => formatPrice(value)}
            width={72}
          />
          <YAxis
            yAxisId="volume"
            orientation="right"
            tick={{ fontSize: 12 }}
            tickFormatter={(value: number) => compactVolumeFormatter.format(value)}
            width={48}
          />
          <Tooltip
            labelFormatter={(label: ReactNode) => formatTradingDay(String(label))}
            formatter={(value: TooltipValue, name: TooltipName) => [
              name === VOLUME_SERIES ? formatVolume(toNumber(value)) : formatPrice(toNumber(value)),
              name,
            ]}
          />
          <Legend />
          {/* Volume sits behind the price lines on its own axis. */}
          <Bar yAxisId="volume" dataKey="volume" name={VOLUME_SERIES} fill="#cbd5e1" barSize={12} />
          <Line
            yAxisId="price"
            type="linear"
            dataKey="lowAverage"
            name="Average Low"
            stroke="#2563eb"
            strokeWidth={2}
            dot={{ r: 2 }}
            connectNulls={false}
          />
          <Line
            yAxisId="price"
            type="linear"
            dataKey="highAverage"
            name="Average High"
            stroke="#16a34a"
            strokeWidth={2}
            dot={{ r: 2 }}
            connectNulls={false}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </figure>
  )
}
