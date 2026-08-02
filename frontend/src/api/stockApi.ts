import { stockDailyResponseSchema, type StockDailyResponse } from '@prometheus/shared'
import { API_BASE_URL } from '../config/env'
import { ApiError, apiErrorKindForStatus } from './errors'

/**
 * Header the backend sets on every response (success or error) carrying the
 * per-request UUID. Kept in sync with the backend's `X-Request-Id` header.
 */
const REQUEST_ID_HEADER = 'X-Request-Id'

interface FetchStockOptions {
  /** Optional abort signal (e.g. supplied by TanStack Query on cancellation). */
  signal?: AbortSignal
}

/**
 * Fetches a symbol's daily aggregates from the backend and validates the
 * response against the shared Zod schema.
 *
 * This is the single boundary between React and the backend HTTP API: it builds
 * the request, translates every failure mode into an {@link ApiError}, and
 * returns the shared, schema-derived {@link StockDailyResponse}. Callers never
 * see raw responses, status codes, or Zod issues.
 *
 * The `symbol` is expected to be already validated/normalized by the caller
 * (the query hook won't issue a request for an invalid symbol); it is still
 * URL-encoded here so it can never alter the request path.
 *
 * @throws {ApiError} on network failure, a non-2xx status, or a success payload
 *   that does not match the shared schema.
 */
export async function fetchStockDailyData(
  symbol: string,
  options: FetchStockOptions = {},
): Promise<StockDailyResponse> {
  const url = `${API_BASE_URL}/api/stocks/${encodeURIComponent(symbol)}`

  let response: Response
  try {
    response = await fetch(url, {
      method: 'GET',
      headers: { Accept: 'application/json' },
      signal: options.signal,
    })
  } catch (cause) {
    // A rejected `fetch` means the request never completed (offline, DNS, CORS,
    // or an abort). Propagate aborts unchanged so TanStack Query recognises the
    // cancellation instead of treating it as a real error.
    if (cause instanceof DOMException && cause.name === 'AbortError') {
      throw cause
    }
    throw new ApiError(
      'network',
      'Unable to reach the server. Check your connection and try again.',
      { cause },
    )
  }

  const requestId = response.headers.get(REQUEST_ID_HEADER) ?? undefined

  if (!response.ok) {
    throw new ApiError(
      apiErrorKindForStatus(response.status),
      await extractErrorMessage(response),
      {
        status: response.status,
        requestId,
      },
    )
  }

  const payload = await parseJsonBody(response, requestId)

  // The backend response is untrusted at this boundary; validate its full shape
  // with the shared schema rather than trusting the wire format.
  const parsed = stockDailyResponseSchema.safeParse(payload)
  if (!parsed.success) {
    throw new ApiError('invalid_response', 'The server returned data in an unexpected format.', {
      requestId,
      cause: parsed.error,
    })
  }

  return parsed.data
}

/** Reads a successful response body as JSON, mapping parse failures to ApiError. */
async function parseJsonBody(response: Response, requestId: string | undefined): Promise<unknown> {
  try {
    return (await response.json()) as unknown
  } catch (cause) {
    throw new ApiError('invalid_response', 'The server returned data in an unexpected format.', {
      requestId,
      cause,
    })
  }
}

/**
 * Best-effort extraction of the human-readable message from a backend error
 * body (`{ error, requestId }`), falling back to a status-based default. The
 * body is untrusted, so its shape is narrowed defensively.
 */
async function extractErrorMessage(response: Response): Promise<string> {
  try {
    const body: unknown = await response.json()
    if (isRecord(body) && typeof body.error === 'string') {
      return body.error
    }
  } catch {
    // Ignore a missing/invalid error body and fall through to a default.
  }
  return defaultMessageForStatus(response.status)
}

/** Narrows unknown JSON to a plain object without resorting to type assertions. */
function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

/** User-facing fallback message when the backend supplies no error text. */
function defaultMessageForStatus(status: number): string {
  switch (status) {
    case 400:
      return 'The stock symbol is invalid.'
    case 404:
      return 'No market data was found for that symbol.'
    case 429:
      return 'Too many requests. Please wait a moment and try again.'
    default:
      return 'Something went wrong while fetching stock data.'
  }
}
