/**
 * Public entry point for the shared contract package.
 *
 * Zod schemas are the single source of truth for every shape that crosses the
 * frontend/backend boundary. Schemas are defined first and their TypeScript
 * types are inferred with `z.infer`; consumers import both from here and must
 * not redefine these contracts locally.
 */
export * from './stock.js'
