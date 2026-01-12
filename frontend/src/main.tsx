import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from 'react-hot-toast'
import { ThemeProvider } from './context/ThemeContext.tsx'

const queryClient = new QueryClient()

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <App />
        <Toaster position="top-right" toastOptions={{
          style: {
            background: '#1f2937', // Gray-800
            color: '#fff',
            border: '1px solid rgba(255,255,255,0.1)',
          }
        }} />
      </ThemeProvider>
    </QueryClientProvider>
  </React.StrictMode>,
)

