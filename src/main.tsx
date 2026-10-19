import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

// StrictMode removed to prevent double WebGL context creation and frame lag in game loop
createRoot(document.getElementById('root')!).render(
  <App />
)
