import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import EarthquakeApp from './EarthquakeApp.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <EarthquakeApp />
  </StrictMode>,
)
