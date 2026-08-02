import type { StockDailyResponse } from '@prometheus/shared'
import type { UseQueryResult } from '@tanstack/react-query'
import { useEffect, useRef } from 'react'
import { toast } from 'sonner'
import { ApiError } from '../api/errors'

interface UseStockNotificationsParams {
  /** The normalized symbol the query is for, or `null` before any search. */
  symbol: string | null
  /** The stock query whose settled results drive notifications. */
  query: UseQueryResult<StockDailyResponse, ApiError>
}

/**
 * Emits transient Sonner notifications for the outcome of the stock query.
 *
 * Toasts *supplement* the persistent inline states rendered by the dashboard;
 * they are never the sole representation of an error.
 *
 * Duplicates from React re-renders, StrictMode double-effects, or TanStack Query
 * lifecycle churn are avoided by firing only when the query's `dataUpdatedAt` /
 * `errorUpdatedAt` timestamps advance — i.e. once per settled fetch — rather
 * than on every render where `isSuccess`/`isError` happen to be true.
 */
export function useStockNotifications({ symbol, query }: UseStockNotificationsParams): void {
  const { isSuccess, isError, data, error, dataUpdatedAt, errorUpdatedAt } = query

  const lastSuccessAt = useRef(0)
  const lastErrorAt = useRef(0)

  useEffect(() => {
    if (!isSuccess || dataUpdatedAt === 0 || dataUpdatedAt === lastSuccessAt.current) {
      return
    }
    lastSuccessAt.current = dataUpdatedAt
    notifySuccess(symbol, data)
  }, [isSuccess, dataUpdatedAt, data, symbol])

  useEffect(() => {
    if (!isError || errorUpdatedAt === 0 || errorUpdatedAt === lastErrorAt.current) {
      return
    }
    lastErrorAt.current = errorUpdatedAt
    notifyError(error)
  }, [isError, errorUpdatedAt, error])
}

function notifySuccess(symbol: string | null, data: StockDailyResponse | undefined): void {
  if (!symbol || !data) {
    return
  }
  if (data.length === 0) {
    // An empty (but valid) response is a distinct, non-error outcome.
    toast.info(`No market data found for ${symbol}.`)
    return
  }
  const dayLabel = data.length === 1 ? 'trading day' : 'trading days'
  toast.success(`Loaded ${data.length} ${dayLabel} for ${symbol}.`)
}

function notifyError(error: ApiError | null): void {
  // Every query failure is an ApiError, but narrow defensively for the fallback.
  const message =
    error instanceof ApiError ? error.message : 'Something went wrong. Please try again.'
  const kind = error instanceof ApiError ? error.kind : 'server'

  switch (kind) {
    case 'bad_request':
      toast.error('Invalid symbol', { description: message })
      break
    case 'not_found':
      toast.error('No data found', { description: message })
      break
    case 'rate_limited':
      toast.warning('Too many requests', { description: message })
      break
    case 'network':
      toast.error('Connection problem', { description: message })
      break
    case 'invalid_response':
      toast.error('Unexpected response', { description: message })
      break
    case 'server':
    default:
      toast.error('Request failed', { description: message })
      break
  }
}
