import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { ToastProvider } from './contexts/ToastContext.tsx'
import { Analytics } from '@vercel/analytics/react'
import ErrorBoundary from './components/ErrorBoundary.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <ToastProvider>
        <Analytics />
        <App />
      </ToastProvider>
    </ErrorBoundary>
  </StrictMode>,
)
