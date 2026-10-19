import React from 'react'
import { renderToString } from 'react-dom/server'
import App from './App.jsx'

// Point d'entrée du pré-rendu (vite build --ssr), lu par scripts/prerender.mjs
export { ROUTES, NOT_FOUND, normalize } from './routes.jsx'
export { SITE } from './data/site.js'
export { headFor } from './seo/head.js'

export const render = path => renderToString(
  <React.StrictMode>
    <App path={path} />
  </React.StrictMode>
)
