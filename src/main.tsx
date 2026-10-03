import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, HashRouter } from 'react-router-dom'
import App from './App'
import { startQueue } from './lib/uploadQueue'
import { SINGLE_FILE } from './lib/util'
import './index.css'

startQueue()

const Router = SINGLE_FILE ? HashRouter : BrowserRouter

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Router>
      <App />
    </Router>
  </StrictMode>,
)
