import React from 'react'
import { hydrateRoot } from 'react-dom/client'
import App from './App.jsx'

// Point d'entrée du test d'hydratation (npm run check:hydration, outil de dev) :
// reprend une page pré-rendue comme le ferait le navigateur
export const mount = (path, el) => hydrateRoot(
  el,
  <React.StrictMode>
    <App path={path} />
  </React.StrictMode>,
  { onRecoverableError: e => console.error('[onRecoverableError]', e.message) }
)
