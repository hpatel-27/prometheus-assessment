import { stockSymbolSchema } from '@prometheus/shared'
import { useId, useState } from 'react'

interface StockSearchProps {
  /**
   * Invoked with a normalized, schema-valid symbol when the form is submitted.
   * Never called for empty or invalid input.
   */
  onSearch: (symbol: string) => void
  /**
   * Invoked with the validation message when the user submits an invalid symbol.
   * Lets the parent surface a transient notification while this component keeps
   * showing the persistent inline message. Optional so the search stays usable
   * without any notification wiring.
   */
  onInvalidSymbol?: (message: string) => void
  /** When true, a request is in flight; the form is disabled to prevent resubmits. */
  isLoading?: boolean
}

/**
 * Stock symbol search form.
 *
 * Validation and normalization are delegated entirely to the shared
 * {@link stockSymbolSchema} (trim + upper-case + character/length rules), so the
 * frontend never duplicates the symbol rules. On submit the raw input is parsed:
 * a failure shows the schema's own message inline; success normalizes the field
 * and lifts the clean symbol to the parent.
 *
 * The component is independent of how results are visualized — it only knows how
 * to collect and validate a symbol and report loading state.
 */
export function StockSearch({ onSearch, onInvalidSymbol, isLoading = false }: StockSearchProps) {
  const [value, setValue] = useState('')
  const [validationError, setValidationError] = useState<string | null>(null)

  const inputId = useId()
  const errorId = useId()

  function handleSubmit(event: React.SubmitEvent<HTMLFormElement>) {
    // Prevent the native GET navigation; submitting via Enter or the button both
    // route through here.
    event.preventDefault()

    const parsed = stockSymbolSchema.safeParse(value)
    if (!parsed.success) {
      const message = parsed.error.issues[0]?.message ?? 'Enter a valid stock symbol.'
      setValidationError(message)
      onInvalidSymbol?.(message)
      return
    }

    // Reflect the normalized (trimmed, upper-cased) form back to the user and
    // clear any prior validation message before dispatching the search.
    setValue(parsed.data)
    setValidationError(null)
    onSearch(parsed.data)
  }

  function handleChange(next: string) {
    setValue(next)
    // Clear a stale validation message as soon as the user edits the field.
    if (validationError) {
      setValidationError(null)
    }
  }

  return (
    <section aria-labelledby="search-heading">
      <h2 id="search-heading" className="mb-3 text-sm font-semibold text-slate-700">
        Look up a stock
      </h2>
      <form onSubmit={handleSubmit} noValidate>
        <label htmlFor={inputId} className="mb-1 block text-sm font-medium text-slate-700">
          Stock symbol
        </label>
        <div className="flex flex-col gap-3 sm:flex-row">
          <input
            id={inputId}
            type="text"
            name="symbol"
            value={value}
            onChange={(event) => handleChange(event.target.value)}
            placeholder="e.g. AAPL"
            autoComplete="off"
            autoCapitalize="characters"
            spellCheck={false}
            disabled={isLoading}
            aria-invalid={validationError !== null}
            aria-describedby={validationError ? errorId : undefined}
            className="flex-1 rounded-md border border-slate-300 px-3 py-2 text-slate-900 uppercase placeholder:normal-case placeholder:text-slate-400 focus:border-slate-500 focus:ring-2 focus:ring-slate-200 focus:outline-none disabled:cursor-not-allowed disabled:bg-slate-100"
          />
          <button
            type="submit"
            disabled={isLoading}
            className="rounded-md bg-slate-900 px-4 py-2 font-medium text-white transition-colors hover:bg-slate-700 focus:ring-2 focus:ring-slate-300 focus:outline-none disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isLoading ? 'Searching…' : 'Search'}
          </button>
        </div>
        {validationError && (
          <p id={errorId} role="alert" className="mt-2 text-sm text-red-600">
            {validationError}
          </p>
        )}
      </form>
    </section>
  )
}
