import { Header } from './components/Header'
import { StockDashboard } from './components/StockDashboard'

/**
 * Application shell: a header plus the stock dashboard, which owns the search,
 * data fetching (via TanStack Query) and result visualization.
 */
export default function App() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <Header />
      <main className="mx-auto max-w-3xl px-6 py-8">
        <StockDashboard />
      </main>
    </div>
  )
}
