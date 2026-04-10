import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'

// Font Awesome — self-hosted via npm (elimine le CDN render-blocking)
import '@fortawesome/fontawesome-free/css/all.min.css'

// i18n — initialiser avant le rendu
import './i18n'

import './index.css'
import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
