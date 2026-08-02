import { stockSymbolSchema, type StockDailyResponse } from '@prometheus/shared'
import { useQuery, type UseQueryResult } from '@tanstack/react-query'
import { ApiError } from '../api/errors'
import { fetchStockDailyData } from '../api/stockApi'
import { stockKeys } from '../queries/stockKeys'

// Intraday aggregates change slowly relative to a user's interactions, so keep
// data fresh for a few minutes to avoid redundant refetches, and retain it in
// the cache for longer so revisiting a symbol is instant.
const STALE_TIME_MS = 5 * 60 * 1000
const GC_TIME_MS = 30 * 60 * 1000
const MAX_RETRIES = 2

/**
 * Fetches and caches a symbol's daily aggregates via TanStack Query.
 *
 * The raw user input is validated and normalized with the shared
 * {@link stockSymbolSchema}. When the symbol is empty or invalid the query is
 * disabled, so no request is made for input the backend would reject. The
 * normalized symbol is what keys the cache and reaches the API client.
 *
 * @param symbol - Raw symbol input (may be empty, unnormalized, or invalid).
 * @returns The TanStack Query result exposing loading/error/success state and
 *   the shared {@link StockDailyResponse}. Errors are {@link ApiError}s.
 */
export function useStockData(symbol: string): UseQueryResult<StockDailyResponse, ApiError> {
  const parsed = stockSymbolSchema.safeParse(symbol)
  const normalizedSymbol = parsed.success ? parsed.data : null

  return useQuery({
    // The empty-string fallback is never fetched: the query is disabled unless a
    // normalized symbol exists.
    queryKey: stockKeys.detail(normalizedSymbol ?? ''),
    queryFn: ({ signal }) => {
      if (normalizedSymbol === null) {
        // Unreachable while `enabled` guards on the same condition; kept as a
        // safety net so the symbol reaching the client is always valid.
        throw new ApiError('bad_request', 'A valid stock symbol is required.')
      }
      return fetchStockDailyData(normalizedSymbol, { signal })
    },
    enabled: normalizedSymbol !== null,
    staleTime: STALE_TIME_MS,
    gcTime: GC_TIME_MS,
    // Rely on staleTime for freshness rather than refetching on every focus.
    refetchOnWindowFocus: false,
    retry: (failureCount, error) => {
      // Deterministic client errors won't succeed on retry — a bad or unknown
      // symbol stays bad. Only retry transient network/server failures.
      if (
        error instanceof ApiError &&
        (error.kind === 'bad_request' || error.kind === 'not_found')
      ) {
        return false
      }
      return failureCount < MAX_RETRIES
    },
  })
}
