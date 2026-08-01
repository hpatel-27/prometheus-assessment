/**
 * Shared contract surface for the stock market MVP.
 *
 * This package is the single source of truth for API contracts: Zod schemas are
 * defined here and their TypeScript types are inferred from them, so the backend
 * and frontend cannot drift apart. The schemas themselves are added in a later
 * commit — this initial scaffold only establishes that the package is buildable
 * and consumable from both sides of the stack.
 */

/** Package identifier, primarily useful as a wiring/health check during setup. */
export const SHARED_PACKAGE_NAME = '@prometheus/shared' as const
