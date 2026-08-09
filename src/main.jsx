import React from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.jsx'
import './styles.css'

// The launcher is intentionally a controlled surface. Disable the browser
// context menu everywhere, including on images and the terminal view.
document.addEventListener('contextmenu', (event) => event.preventDefault())

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
