import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './styles/global.css'

// Page pré-rendue (build) : React reprend le HTML existant.
// Racine vide (npm run dev) : rendu classique dans le navigateur.
const el = document.getElementById('root')
const tree = (
  <React.StrictMode>
    <App path={window.location.pathname} />
  </React.StrictMode>
)

if (el.hasChildNodes()) {
  ReactDOM.hydrateRoot(el, tree, { onRecoverableError: e => console.warn('[hydratation]', e) })
} else {
  ReactDOM.createRoot(el).render(tree)
}
