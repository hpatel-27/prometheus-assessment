import { useState } from 'react'

interface StockSearchProps {
  /** Invoked with the entered symbol when the search form is submitted. */
  onSearch: (symbol: string) => void
}

/**
 * Stock search section. A small controlled form that lifts the submitted symbol
 * to its parent. It performs no data fetching itself — request orchestration
 * lives in a TanStack Query hook wired up in a later change.
 */
export function StockSearch({ onSearch }: StockSearchProps) {
  const [value, setValue] = useState('')

  function handleSubmit(event: React.SubmitEvent<HTMLFormElement>) {
    event.preventDefault()
    onSearch(value)
  }

  return (
    <section aria-labelledby="search-heading">
      <h2 id="search-heading" className="sr-only">
        Search for a stock symbol
      </h2>
      <form onSubmit={handleSubmit} className="flex flex-col gap-3 sm:flex-row">
        <input
          type="text"
          name="symbol"
          value={value}
          onChange={(event) => setValue(event.target.value)}
          placeholder="Enter a symbol, e.g. AAPL"
          autoComplete="off"
          autoCapitalize="characters"
          spellCheck={false}
          className="flex-1 rounded-md border border-slate-300 px-3 py-2 text-slate-900 uppercase placeholder:normal-case placeholder:text-slate-400 focus:border-slate-500 focus:ring-2 focus:ring-slate-200 focus:outline-none"
        />
        <button
          type="submit"
          className="rounded-md bg-slate-900 px-4 py-2 font-medium text-white transition-colors hover:bg-slate-700 focus:ring-2 focus:ring-slate-300 focus:outline-none"
        >
          Search
        </button>
      </form>
    </section>
  )
}
