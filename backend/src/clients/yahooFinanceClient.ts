import { stockSymbolSchema } from '@prometheus/shared'
import { env } from '../config/env.js'
import { BadRequestError, InternalServerError, NotFoundError } from '../errors/HttpError.js'
import { yahooChartResponseSchema, type YahooChartResult } from './yahooChartSchema.js'

/**
 * Yahoo Finance v8 chart endpoint. The validated symbol is appended as a single
 * path segment: `.../v8/finance/chart/{symbol}`.
 */
const YAHOO_CHART_BASE_URL = 'https://query1.finance.yahoo.com/v8/finance/chart'

/**
 * Yahoo rejects requests without a browser-like `User-Agent`, so we send a
 * realistic desktop UA. This is a required upstream header to obtain data, not
 * client tracking.
 */
const YAHOO_USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'

// 15-minute intraday granularity over approximately the previous month, per the
// application's data requirement.
const YAHOO_INTERVAL = '15m'
const YAHOO_RANGE = '1mo'

/**
 * Fetches roughly one month of 15-minute intraday data for a symbol from Yahoo
 * Finance and returns the validated upstream result for the normalization layer.
 *
 * This is the sole boundary through which the application talks to Yahoo. It is
 * responsible for:
 *  - validating and normalizing the symbol *before* it is placed into the
 *    request URL (defense in depth against path/URL injection and SSRF),
 *  - constructing the request with the required interval, range and User-Agent,
 *  - enforcing a request timeout,
 *  - translating upstream HTTP/network failures into application errors, and
 *  - parsing and validating the untrusted response structure.
 *
 * The returned {@link YahooChartResult} is Yahoo's (validated) shape and must
 * not be passed beyond the normalization layer.
 *
 * @throws BadRequestError when the symbol is not a valid stock symbol.
 * @throws NotFoundError when Yahoo reports no data for the symbol.
 * @throws InternalServerError on timeout, network failure, or an unexpected or
 *   unparseable upstream response.
 */
export async function fetchYahooChart(symbol: string): Promise<YahooChartResult> {
  // Validate + normalize before doing anything else. The symbol is user input
  // that gets interpolated into an outbound URL, so it must never reach the
  // request untrusted — this guards against URL injection / SSRF.
  const parsedSymbol = stockSymbolSchema.safeParse(symbol)
  if (!parsedSymbol.success) {
    throw new BadRequestError('A valid stock symbol is required.')
  }
  const normalizedSymbol = parsedSymbol.data

  const url = new URL(`${YAHOO_CHART_BASE_URL}/${encodeURIComponent(normalizedSymbol)}`)
  url.searchParams.set('interval', YAHOO_INTERVAL)
  url.searchParams.set('range', YAHOO_RANGE)

  const response = await requestWithTimeout(url, normalizedSymbol)

  // Yahoo returns a JSON envelope for both success and error responses (an
  // unknown symbol yields HTTP 404 with an `error` body), so parse it once and
  // then branch on its contents rather than on the status code alone.
  let body: unknown
  try {
    body = await response.json()
  } catch {
    throw new InternalServerError('Received a malformed response from the market data provider.')
  }

  const parsed = yahooChartResponseSchema.safeParse(body)
  if (!parsed.success) {
    // The upstream contract changed or returned something we do not model.
    throw new InternalServerError('Received an unexpected response from the market data provider.')
  }

  const { chart } = parsed.data

  // An explicit `error` object is Yahoo's way of signaling an unknown or
  // delisted symbol; surface it as a 404 for the caller.
  if (chart.error) {
    throw new NotFoundError(`No market data found for symbol "${normalizedSymbol}".`)
  }

  if (!response.ok) {
    // Any other non-2xx (rate limiting, upstream outage, etc.) is an upstream
    // failure we cannot meaningfully act on; report a safe 500.
    throw new InternalServerError('The market data provider returned an error.')
  }

  const result = chart.result?.[0]
  if (!result) {
    throw new NotFoundError(`No market data found for symbol "${normalizedSymbol}".`)
  }

  // A present-but-empty result (no `timestamp`/quote data in the window) is a
  // valid, non-error outcome and is handled downstream as an empty series.
  return result
}

/**
 * Performs the HTTP request with a hard timeout, mapping transport-level
 * failures (timeout, DNS, connection reset, TLS) to a safe application error.
 * The upstream provider is referred to generically so implementation details
 * are not leaked to clients.
 */
async function requestWithTimeout(url: URL, symbol: string): Promise<Response> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), env.YAHOO_REQUEST_TIMEOUT_MS)

  try {
    return await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': YAHOO_USER_AGENT,
        Accept: 'application/json',
      },
    })
  } catch (error) {
    // AbortController raises an AbortError when the timeout elapses.
    if (error instanceof Error && error.name === 'AbortError') {
      throw new InternalServerError(`Timed out fetching market data for symbol "${symbol}".`)
    }
    throw new InternalServerError(
      `Failed to reach the market data provider for symbol "${symbol}".`,
    )
  } finally {
    clearTimeout(timeout)
  }
}
