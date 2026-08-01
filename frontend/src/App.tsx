import { SHARED_PACKAGE_NAME } from '@prometheus/shared'
import './App.css'

// Placeholder shell for the initial scaffold. The real UI (symbol search and
// intraday daily aggregates) is implemented in a later commit; importing from
// the shared package here verifies the frontend can consume shared contracts.
export default function App() {
  return (
    <main className="app">
      <h1>Stock Market MVP</h1>
      <p>
        Frontend scaffold is ready. Shared contracts are provided by{' '}
        <code>{SHARED_PACKAGE_NAME}</code>.
      </p>
    </main>
  )
}
