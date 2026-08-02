import type { StockDailyResponse } from '@prometheus/shared'
import { useState, type ReactNode } from 'react'
import { toast } from 'sonner'
import type { ApiError } from '../api/errors'
import { useStockData } from '../hooks/useStockData'
import { useStockNotifications } from '../hooks/useStockNotifications'
import { StockChart } from './StockChart'
import { StockResultsTable } from './StockResultsTable'
import { StockSearch } from './StockSearch'

/**
 * Top-level stock dashboard: the complete user flow of entering a symbol,
 * validating it, fetching data, and displaying loading/error/empty/results
 * states as table + chart.
 *
 * Server state is owned entirely by TanStack Query (via {@link useStockData}) —
 * the only local state here is the currently submitted symbol, which is UI
 * input rather than server state. Toasts (via {@link useStockNotifications})
 * supplement, and never replace, the persistent inline states rendered below.
 */
export function StockDashboard() {
  const [symbol, setSymbol] = useState<string | null>(null)
  const query = useStockData(symbol ?? '')
  useStockNotifications({ symbol, query })

  const { data, error, isError, isLoading, isSuccess, isFetching } = query

  // A background refetch is in flight when we are fetching but already past the
  // initial load (cached/previous data is on screen).
  const isRefreshing = isFetching && !isLoading && symbol !== null

  return (
    <div className="flex flex-col gap-8">
      <StockSearch
        onSearch={setSymbol}
        onInvalidSymbol={(message) => toast.error('Invalid symbol', { description: message })}
        isLoading={isFetching}
      />

      <section aria-labelledby="results-heading" aria-live="polite" aria-busy={isFetching}>
        <div className="mb-3 flex items-center justify-between">
          <h2 id="results-heading" className="text-sm font-semibold text-slate-700">
            Results
          </h2>
          {isRefreshing && (
            <span className="text-xs text-slate-500" role="status">
              Updating…
            </span>
          )}
        </div>
        <ResultsRegion
          symbol={symbol}
          data={data}
          error={error}
          isError={isError}
          isLoading={isLoading}
          isSuccess={isSuccess}
        />
      </section>
    </div>
  )
}

interface ResultsRegionProps {
  symbol: string | null
  data: StockDailyResponse | undefined
  error: ApiError | null
  isError: boolean
  isLoading: boolean
  isSuccess: boolean
}

function ResultsRegion({ symbol, data, error, isError, isLoading, isSuccess }: ResultsRegionProps) {
  if (symbol === null) {
    return <Panel muted>Search for a stock symbol to see its daily aggregates.</Panel>
  }

  if (isLoading) {
    return <Panel muted>Loading daily aggregates for {symbol}…</Panel>
  }

  if (isError) {
    return (
      <Panel>
        <p role="alert" className="text-red-600">
          {error?.message ?? 'Something went wrong while loading this symbol.'}
        </p>
        {error?.requestId && (
          <p className="mt-1 text-xs text-slate-400">Request ID: {error.requestId}</p>
        )}
      </Panel>
    )
  }

  if (isSuccess && data) {
    if (data.length === 0) {
      return <Panel muted>No market data was found for {symbol}.</Panel>
    }
    return (
      <div className="flex flex-col gap-6">
        <div className="rounded-md border border-slate-200 bg-white p-4">
          <StockChart days={data} symbol={symbol} />
        </div>
        <div className="rounded-md border border-slate-200 bg-white">
          <StockResultsTable days={data} symbol={symbol} />
        </div>
      </div>
    )
  }

  return <Panel muted>Search for a stock symbol to see its daily aggregates.</Panel>
}

function Panel({ children, muted = false }: { children: ReactNode; muted?: boolean }) {
  return (
    <div
      className={`rounded-md border border-slate-200 bg-white p-8 text-center ${
        muted ? 'text-slate-500' : ''
      }`}
    >
      {children}
    </div>
  )
}
