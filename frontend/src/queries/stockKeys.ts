/**
 * Query key factory for stock data.
 *
 * All stock queries are keyed through this factory so cache reads and
 * invalidations reference a single source of truth instead of string literals
 * scattered across the app. Invalidate every stock query with `stockKeys.all`,
 * or a single symbol with `stockKeys.detail(symbol)`.
 *
 * Keys are `as const` so their element types are preserved for type-safe use
 * with TanStack Query.
 */
export const stockKeys = {
  /** Root key namespacing every stock-related query. */
  all: ['stocks'] as const,
  /** Key for a single symbol's daily aggregates. */
  detail: (symbol: string) => [...stockKeys.all, 'detail', symbol] as const,
} as const
