import type { StockDailyData } from '@prometheus/shared'
import { useEffect, type ReactNode } from 'react'
import { toast } from 'sonner'
import { useStockData } from '../hooks/useStockData'

interface StockResultsProps {
  /** The symbol currently being viewed, or `null` before any search. */
  symbol: string | null
}

// Prices are rounded to four decimals by the backend; show up to that precision.
const priceFormatter = new Intl.NumberFormat(undefined, {
  minimumFractionDigits: 2,
  maximumFractionDigits: 4,
})
const volumeFormatter = new Intl.NumberFormat()

/**
 * Results section. Consumes the {@link useStockData} hook (never a raw request)
 * and renders its loading, error, empty and success states. Errors are shown
 * inline here and additionally surfaced as a transient toast, so a toast is
 * never the only representation of a failure.
 */
export function StockResults({ symbol }: StockResultsProps) {
  const { data, error, isError, isLoading, isSuccess } = useStockData(symbol ?? '')

  // Fire the toast only when the error instance changes, not on every render, to
  // avoid duplicate notifications from React/TanStack Query re-renders.
  useEffect(() => {
    if (isError && error) {
      toast.error(error.message)
    }
  }, [isError, error])

  return (
    <section aria-labelledby="results-heading" aria-live="polite">
      <h2 id="results-heading" className="mb-3 text-sm font-semibold text-slate-700">
        Results
      </h2>
      <div className="rounded-md border border-slate-200 bg-white">
        <ResultsBody
          symbol={symbol}
          days={data}
          errorMessage={isError ? (error?.message ?? 'Something went wrong.') : null}
          isLoading={isLoading && symbol !== null}
          isSuccess={isSuccess}
        />
      </div>
    </section>
  )
}

interface ResultsBodyProps {
  symbol: string | null
  days: StockDailyData[] | undefined
  errorMessage: string | null
  isLoading: boolean
  isSuccess: boolean
}

function ResultsBody({ symbol, days, errorMessage, isLoading, isSuccess }: ResultsBodyProps) {
  if (symbol === null) {
    return <Placeholder>Search for a stock symbol to see its daily aggregates.</Placeholder>
  }

  if (isLoading) {
    return <Placeholder>Loading daily aggregates for {symbol}…</Placeholder>
  }

  if (errorMessage) {
    return (
      <p role="alert" className="p-8 text-center text-red-600">
        {errorMessage}
      </p>
    )
  }

  if (isSuccess && days) {
    if (days.length === 0) {
      return <Placeholder>No market data was found for {symbol}.</Placeholder>
    }
    return <DailyTable days={days} />
  }

  return <Placeholder>Search for a stock symbol to see its daily aggregates.</Placeholder>
}

function DailyTable({ days }: { days: StockDailyData[] }) {
  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="border-b border-slate-200 text-left text-slate-500">
          <th className="px-4 py-2 font-medium">Day</th>
          <th className="px-4 py-2 text-right font-medium">Low avg</th>
          <th className="px-4 py-2 text-right font-medium">High avg</th>
          <th className="px-4 py-2 text-right font-medium">Volume</th>
        </tr>
      </thead>
      <tbody>
        {days.map((day) => (
          <tr key={day.day} className="border-b border-slate-100 last:border-0">
            {/* `day` is the America/New_York trading date as a plain YYYY-MM-DD
                string. Render it verbatim — parsing it into a Date would apply
                the browser's timezone and could shift the represented day. */}
            <td className="px-4 py-2 text-slate-800 tabular-nums">{day.day}</td>
            <td className="px-4 py-2 text-right text-slate-800 tabular-nums">
              {priceFormatter.format(day.lowAverage)}
            </td>
            <td className="px-4 py-2 text-right text-slate-800 tabular-nums">
              {priceFormatter.format(day.highAverage)}
            </td>
            <td className="px-4 py-2 text-right text-slate-800 tabular-nums">
              {volumeFormatter.format(day.volume)}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

function Placeholder({ children }: { children: ReactNode }) {
  return <p className="p-8 text-center text-slate-500">{children}</p>
}
