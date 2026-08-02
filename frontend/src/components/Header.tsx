/**
 * Application header. Presentational only — no state or data dependencies.
 */
export function Header() {
  return (
    <header className="border-b border-slate-200 bg-white">
      <div className="mx-auto flex max-w-3xl items-center gap-3 px-6 py-4">
        <span aria-hidden className="text-2xl">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="lucide lucide-trending-up-icon lucide-trending-up"
          >
            <path d="M16 7h6v6" />
            <path d="m22 7-8.5 8.5-5-5L2 17" />
          </svg>
        </span>
        <div>
          <h1 className="text-lg font-semibold text-slate-900">Stock Market MVP</h1>
          <p className="text-sm text-slate-500">Daily aggregates from intraday market data</p>
        </div>
      </div>
    </header>
  )
}
