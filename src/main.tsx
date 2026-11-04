import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
// Debe cargarse antes del primer render: captura el aviso de instalación (Android) y registra el service worker
import './pwa/install'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
