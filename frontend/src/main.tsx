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
        <Toaster position="bottom-right" toastOptions={{
          style: {
            background: '#333',
            color: '#fff',
          }
        }} />
      </ThemeProvider>
    </QueryClientProvider>
  </React.StrictMode>,
)

