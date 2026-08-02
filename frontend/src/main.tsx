import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { Toaster } from 'sonner'
import App from './App.tsx'
import './index.css'

// A single QueryClient for the app. Per-query stale/cache tuning for intraday
// market data lives with the stock query hook rather than as a global default.
const queryClient = new QueryClient()

const rootElement = document.getElementById('root')
if (!rootElement) {
  throw new Error('Root element #root was not found in the document.')
}

createRoot(rootElement).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
      {/* Transient success/error notifications. Persistent errors are also shown
          inline in the page, so toasts are never the only representation. */}
      <Toaster richColors position="top-right" />
    </QueryClientProvider>
  </StrictMode>,
)
