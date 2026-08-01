AGENTS.md
Project Overview

This repository contains a small full-stack stock market MVP.

The application consists of three top-level areas:

backend/ — Node.js + TypeScript + Express API
frontend/ — React + TypeScript client
shared/ — shared Zod schemas and types

This is intentionally a small MVP. Do not introduce monorepo frameworks, apps//packages/ directory structures, or infrastructure that is disproportionate to the application's size.

The project uses npm, not pnpm, Yarn, Bun, or another package manager.

Core Architecture

The backend exposes an API that retrieves intraday stock-market data from Yahoo Finance and transforms it into daily aggregates.

The frontend consumes only the application's backend API. It must never call Yahoo Finance directly.

The high-level flow is:

React frontend
    |
    v
Backend REST API
    |
    v
Stock service
    |
    v
Yahoo Finance client
    |
    v
Yahoo Finance API

The backend transformation pipeline is:

Yahoo Finance response
    |
    v
Validate/parse upstream response
    |
    v
Normalize intraday observations
    |
    v
Group by America/New_York calendar day
    |
    v
Calculate daily aggregates
    |
    v
Validate final response with shared Zod schema
    |
    v
Return API response
Repository Structure

Keep the repository simple:

/
├── backend/
│   └── src/
├── frontend/
│   └── src/
├── shared/
│   └── src/
├── AGENTS.md
├── package.json
├── package-lock.json
└── ...

Do not introduce apps/, packages/, Nx, Turborepo, or another monorepo framework unless explicitly requested.

TypeScript Standards

Use strict TypeScript.

Do not use any unless there is an exceptional, documented reason.

Prefer:

explicit types at public boundaries
type inference internally where it improves readability
discriminated unions where appropriate
narrow types
immutable data where practical
unknown instead of any for untrusted data

Avoid unnecessary type assertions.

Do not use type assertions to bypass validation.

Zod Is the Source of Truth

Zod schemas are the canonical definition of shared API contracts.

Define schemas first and derive TypeScript types from them.

For example:

const stockDailyDataSchema = z.object({
  day: z.string(),
  lowAverage: z.number(),
  highAverage: z.number(),
  volume: z.number(),
});

type StockDailyData = z.infer<typeof stockDailyDataSchema>;

Do not separately create:

interface StockDailyData {
  // duplicated contract
}

The frontend and backend must consume the schemas/types exported from shared/.

Do not duplicate API contracts in application-specific directories.

Validation

All external/untrusted data must be validated at appropriate boundaries.

This includes:

HTTP request parameters
external Yahoo Finance responses
backend API responses consumed by the frontend
environment configuration where practical

Do not assume that an external API will always return the expected structure.

Prefer Zod validation over handwritten runtime checks for shared contracts.

Stock Symbol Rules

Stock symbols are user-controlled input.

Validate them before:

processing them in business logic
constructing external API URLs

Normalize symbols consistently, including trimming whitespace and converting to uppercase where appropriate.

Never allow the stock symbol to become an arbitrary URL or otherwise create an SSRF vulnerability.

Yahoo Finance

Yahoo Finance is an external dependency and must be isolated behind a dedicated client/service.

Controllers must not call Yahoo Finance directly.

Do not expose Yahoo Finance's response format throughout the application.

The Yahoo response should be:

external response
→ validate/parse
→ normalize
→ business logic

The rest of the application should operate on application-specific normalized data.

The Yahoo Finance request uses approximately one month of 15-minute intraday data.

Trading-Day Semantics

This is an important business rule.

All stock data must be grouped by the America/New_York calendar day.

Do not group by:

UTC calendar day
server-local calendar day
browser-local calendar day
a fixed UTC-5 offset

Use a real timezone implementation capable of handling daylight saving time.

The value returned as:

{
  "day": "YYYY-MM-DD"
}

represents the New York calendar date associated with the market-data timestamp.

Frontend formatting must not convert this date in a way that changes the represented trading day.

Document non-obvious timezone logic with comments where appropriate.

Daily Aggregation Rules

For each New York calendar day:

lowAverage  = arithmetic mean of valid intraday low observations
highAverage = arithmetic mean of valid intraday high observations
volume      = sum of valid intraday volume observations

Do not round individual observations before calculating averages.

Round the final average values to four decimal places for the API representation.

Volume remains an integer.

Missing or null intraday values must be handled safely.

Do not silently treat missing values as zero unless that is explicitly required by the business rule.

Illustrative Examples

API examples in prompts and documentation are illustrative only.

For example:

[
  {
    "day": "2009-01-30",
    "lowAverage": 40.2958,
    "highAverage": 49.7534,
    "volume": 49073348
  }
]

must not be:

hard-coded
treated as production data
treated as a test fixture
interpreted as representing the current date
used to infer business behavior beyond the response shape

Use generated/local examples when implementation details require sample data.

Express Architecture

Keep responsibilities separated:

Routes

Responsible for route registration and middleware composition.

Controllers

Responsible for:

reading validated request data
invoking application services
producing HTTP responses

Controllers should be thin.

Do not put business logic in controllers.

Services

Responsible for business/application logic.

Services should not depend on Express request/response objects.

External clients

Responsible for communicating with external systems such as Yahoo Finance.

Do not allow external API concerns to leak throughout the application.

Middleware

Responsible for cross-cutting HTTP concerns such as:

request IDs
rate limiting
CORS
error handling

Error Handling

Use centralized error handling.

Prefer application-specific error classes such as:

BadRequestError
NotFoundError
TooManyRequestsError
InternalServerError

Known application errors should produce predictable HTTP responses.

Unexpected errors should produce safe 500 responses without exposing implementation details.

Include the request ID in error responses where appropriate.

Do not scatter repetitive error-response logic throughout controllers.

Request IDs

Every request should receive a UUID request ID.

The request ID should:

be available to downstream middleware
be available to error handling
be returned to the client through a response header
be included in relevant server-side logs

Do not use global mutable state for request context.

Rate Limiting

This MVP has no authentication.

Therefore:

do not implement user-based rate limiting
do not invent user identity
rate limiting is based on client IP

The rate limiter should be configurable.

An in-memory implementation is acceptable for the MVP when deployed as a single backend instance.

Do not introduce Redis or distributed rate-limiting infrastructure unless explicitly requested.

If the application is later horizontally scaled, the rate limiter will need a shared store.

Be careful with Express trust proxy configuration. Never configure proxy behavior in a way that allows clients to spoof their source IP.

CORS

CORS must be explicitly configured.

Do not use unrestricted * access in production when credentials or an origin allowlist is appropriate.

Allowed origins should be configurable through environment configuration.

Frontend Architecture

React components should primarily be responsible for presentation and user interaction.

Do not place raw HTTP requests directly inside components.

Use:

component
    ↓
TanStack Query hook
    ↓
API client
    ↓
backend

Keep server state in TanStack Query.

Avoid introducing unnecessary global state.

TanStack Query

Use query key factories for stock data.

The query key should uniquely identify a stock symbol.

Use sensible stale/cache settings for intraday market data.

Avoid unnecessary requests.

Do not request data when the symbol is empty or invalid.

Use query invalidation through the query key factory rather than hard-coded query keys scattered throughout the application.

API Client

The frontend API client is the boundary between React and the backend.

It should:

construct requests
handle HTTP failures
parse responses
validate successful responses with shared Zod schemas
expose useful application errors

React components should not need to know about HTTP status codes or response parsing details.

Styling

Use Tailwind CSS for application styling.

Prefer straightforward, readable utility classes.

Do not build a large design system for this MVP.

Create reusable components only where there is a concrete reuse or maintainability benefit.

Notifications

Use Sonner for transient success/error notifications.

Toasts must not be the only representation of important errors.

Persistent errors should also be represented in the page UI.

Avoid duplicate notifications caused by React rendering or TanStack Query lifecycle behavior.

Comments and Documentation

Write comments to explain why, not merely what.

Good:

// Yahoo timestamps are converted to America/New_York before grouping
// because the API's `day` represents the US market's trading calendar day.

Avoid comments like:

// Convert timestamp.

Public or non-obvious functions should have useful function-signature documentation where appropriate.

Documentation should explain:

intent
important parameters
return behavior
business rules
non-obvious constraints

Do not add comments that merely restate the code.

SOLID and Maintainability

Apply SOLID principles pragmatically.

Prioritize:

single responsibility
clear module boundaries
dependency direction
testable business logic where practical

Do not create abstractions merely to satisfy SOLID mechanically.

This is a small MVP. Prefer a simple, cohesive implementation over an elaborate architecture.

Avoid:

unnecessary factories
unnecessary interfaces
excessive dependency injection
generic abstractions without a concrete use case
premature framework infrastructure
Testing

Automated testing is explicitly out of scope for this MVP.

Do not introduce:

Jest
Vitest
Cypress
Playwright
Supertest
testing frameworks
test suites

unless explicitly requested in a future task.

This does not mean the code should be written carelessly. Maintain clear boundaries, strong runtime validation, strict typing, and predictable error handling.

Dependencies

Prefer mature, actively maintained dependencies.

Do not add a dependency when the requirement can be handled cleanly with existing platform/library functionality.

Before introducing a dependency, consider whether its complexity is justified for this small MVP.

Keep the dependency surface small.

Production Quality

Although this is an MVP, implementation should be suitable for a straightforward production deployment.

Pay attention to:

input validation
safe error handling
request timeouts
CORS
rate limiting
security headers
proxy configuration
configuration validation
graceful shutdown
logging
dependency hygiene
avoiding secrets in source control

Do not introduce enterprise-scale infrastructure unless explicitly requested.

Scope Discipline

Each implementation task/PR should implement only the requested scope.

Do not opportunistically implement future roadmap items.

If a later task will address a concern, leave a clean extension point rather than implementing the later feature early.

Keep each commit logically focused and independently understandable.

Definition of Done

Before considering an implementation complete:

TypeScript passes in strict mode.
No unjustified any usage exists.
Zod schemas remain the source of truth for shared contracts.
Types are inferred from schemas.
Frontend and backend do not duplicate API contracts.
Business logic is separated from HTTP concerns.
External Yahoo Finance logic is isolated.
New York calendar-day semantics are preserved.
Request IDs work consistently.
IP-based rate limiting is correctly applied.
Errors flow through centralized error handling.
CORS is explicitly configured.
No unnecessary testing infrastructure has been introduced.
Linting succeeds.
Formatting succeeds.
Documentation reflects the actual implementation.
Comments explain non-obvious business logic rather than restating code.