import { useState } from 'react'
import { Header } from './components/Header'
import { StockResults } from './components/StockResults'
import { StockSearch } from './components/StockSearch'

/**
 * Application shell: a header plus a main content area containing the stock
 * search and results sections. The submitted symbol is held here and passed to
 * the results section. Data fetching is introduced in a later change.
 */
export default function App() {
  const [symbol, setSymbol] = useState<string | null>(null)

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <Header />
      <main className="mx-auto flex max-w-3xl flex-col gap-8 px-6 py-8">
        <StockSearch onSearch={(value) => setSymbol(value)} />
        <StockResults symbol={symbol} />
      </main>
    </div>
  )
}
