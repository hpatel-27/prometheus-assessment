/**
 * Classification of failures surfaced by the frontend API client.
 *
 * Components and query hooks branch on `kind` rather than inspecting HTTP status
 * codes, `fetch` rejections, or Zod issues directly — that keeps HTTP concerns
 * isolated to the API client.
 */
export type ApiErrorKind =
  | 'bad_request' // 400 — the symbol/request was rejected as invalid
  | 'not_found' // 404 — no market data exists for the symbol
  | 'rate_limited' // 429 — the client exceeded the rate limit
  | 'server' // 5xx or any other unexpected HTTP status
  | 'network' // the request never completed (offline, DNS, CORS)
  | 'invalid_response' // a 2xx body failed shared-schema validation

interface ApiErrorOptions {
  status?: number
  requestId?: string
  cause?: unknown
}

/**
 * Application-level error for every failure the frontend API client can produce.
 *
 * It carries a `kind` for UI branching, the originating HTTP `status` when a
 * response completed, and the backend `requestId` (from the `X-Request-Id`
 * header) when available so users/logs can correlate a failure with the server.
 */
export class ApiError extends Error {
  readonly kind: ApiErrorKind
  readonly status?: number
  readonly requestId?: string

  constructor(kind: ApiErrorKind, message: string, options: ApiErrorOptions = {}) {
    super(message, { cause: options.cause })
    this.name = 'ApiError'
    this.kind = kind
    this.status = options.status
    this.requestId = options.requestId
  }
}

/** Maps an HTTP error status to the corresponding {@link ApiErrorKind}. */
export function apiErrorKindForStatus(status: number): ApiErrorKind {
  switch (status) {
    case 400:
      return 'bad_request'
    case 404:
      return 'not_found'
    case 429:
      return 'rate_limited'
    default:
      return 'server'
  }
}
