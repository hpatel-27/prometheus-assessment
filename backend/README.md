# Backend API

Node.js + TypeScript + Express API that retrieves intraday stock-market data
from Yahoo Finance and transforms it into daily aggregates.

The frontend consumes only this API and never calls Yahoo Finance directly.

## Conventions

- **Base URL:** the server listens on `PORT` (default `3000`), e.g.
  `http://localhost:3000`.
- **Content type:** all responses are `application/json`.
- **Request ID:** every response carries an `X-Request-Id` header (a UUID).
  Error bodies also include the same value as `requestId` to aid correlation
  with server logs.
- **Rate limiting:** requests are limited per client IP. Exceeding the limit
  returns `429`. Standard `RateLimit-*` headers describe the current window.

> **All example values below are illustrative only.** They are synthetic,
> locally generated samples used to show the response _shape_. They are not real
> market data, not fixtures, and must not be relied upon for any actual symbol,
> date, or price.

## Endpoints

### `GET /api/stocks/:symbol`

Returns approximately one month of daily aggregates for the given symbol,
derived from 15-minute intraday data and grouped by **America/New_York**
trading day.

#### Path parameters

| Parameter | Type     | Description                                                                                                                                                         |
| --------- | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `symbol`  | `string` | Stock symbol. Trimmed and upper-cased before use. 1–10 characters; letters, digits, and single `.`/`-` separators between alphanumeric runs (e.g. `AAPL`, `BRK.B`). |

#### Response `200 OK`

An ordered (chronological) array of per-day aggregates. Each element has:

| Field         | Type     | Description                                                                     |
| ------------- | -------- | ------------------------------------------------------------------------------- |
| `day`         | `string` | New York trading day as an ISO `YYYY-MM-DD` calendar date.                      |
| `lowAverage`  | `number` | Arithmetic mean of the day's valid intraday lows, rounded to 4 decimal places.  |
| `highAverage` | `number` | Arithmetic mean of the day's valid intraday highs, rounded to 4 decimal places. |
| `volume`      | `number` | Sum of the day's valid intraday volumes (integer).                              |

The array may be empty when the symbol has no market data in the requested
window.

#### Example request

```bash
curl -i http://localhost:3000/api/stocks/AAPL
```

#### Example response

> Illustrative only — synthetic values.

```http
HTTP/1.1 200 OK
Content-Type: application/json; charset=utf-8
X-Request-Id: 00000000-0000-0000-0000-000000000000
```

```json
[
  {
    "day": "2024-05-13",
    "lowAverage": 100.1234,
    "highAverage": 101.5678,
    "volume": 12345678
  },
  {
    "day": "2024-05-14",
    "lowAverage": 101.4321,
    "highAverage": 102.8765,
    "volume": 23456789
  }
]
```

## Error responses

Errors flow through centralized error handling and share a consistent shape:

```json
{
  "error": "Human-readable message.",
  "requestId": "00000000-0000-0000-0000-000000000000"
}
```

| Status | When                                                                               | Example `error`                                                                            |
| ------ | ---------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| `400`  | The `symbol` fails validation (empty, too long, illegal characters).               | `"A stock symbol may only contain letters, digits, and single \".\" or \"-\" separators."` |
| `404`  | Yahoo Finance reports no data for the symbol (unknown/delisted).                   | `"No market data found for symbol \"AAPL\"."`                                              |
| `429`  | The client IP exceeded the rate limit for the current window.                      | `"Too many requests, please try again later."`                                             |
| `500`  | Upstream timeout, network failure, or an unexpected/unparseable upstream response. | `"An unexpected error occurred."`                                                          |

> Illustrative only. `500` responses never expose internal implementation
> details or stack traces.

### Example error response

> Illustrative only — synthetic values.

```http
HTTP/1.1 404 Not Found
Content-Type: application/json; charset=utf-8
X-Request-Id: 00000000-0000-0000-0000-000000000000
```

```json
{
  "error": "No market data found for symbol \"AAPL\".",
  "requestId": "00000000-0000-0000-0000-000000000000"
}
```

## Request flow

```
request
  → request ID middleware      (assigns X-Request-Id)
  → IP rate limiter            (429 when exceeded)
  → route                      (GET /api/stocks/:symbol)
  → controller                 (validates :symbol via shared Zod schema)
  → stock service              (Yahoo client → normalize → aggregate → validate)
  → centralized error handler  (when any layer throws)
```
