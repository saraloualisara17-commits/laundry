import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import './i18n'
import App from './App.jsx'

// One-time cleanup: remove tokens that were stored in localStorage by the old auth flow
localStorage.removeItem('user')
localStorage.removeItem('refreshToken')

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
