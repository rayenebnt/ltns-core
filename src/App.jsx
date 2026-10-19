// Coquille commune à toutes les pages, rendue deux fois : en HTML au build
// (scripts/prerender.mjs) puis dans le navigateur, qui reprend ce HTML.
// Règle : pendant le rendu, ne jamais lire window, document, localStorage,
// matchMedia, Date ou Math.random. Ces lectures vont dans un useEffect,
// sinon le HTML du serveur et celui du navigateur ne correspondent plus.
import { useEffect, useState } from 'react'
import { Analytics } from '@vercel/analytics/react'
import Background from './components/Background'
import Loader from './components/Loader'
import Cursor from './components/Cursor'
import Nav from './components/Nav'
import StickyCta from './components/StickyCta'
import Footer from './components/Footer'
import { ParcoursProvider } from './components/Parcours'
import { RouteProvider } from './lib/route'
import { resolve } from './routes'
import useReveal from './hooks/useReveal'
import useThermal from './hooks/useThermal'

function ThermalRail() {
  return (
    <>
      <div className="thermal-rail" aria-hidden="true"></div>
      <div className="thermal-rail-label" aria-hidden="true">CHAUFFE</div>
    </>
  )
}

export default function App({ path }) {
  const route = resolve(path)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    const t = setTimeout(() => setLoaded(true), 250)
    return () => clearTimeout(t)
  }, [])

  useReveal(loaded)
  useThermal()

  // Arrivée sur une ancre (ex. /#faq) : on y va une fois la page prête.
  // Pas au rechargement ni au retour arrière : le navigateur garde sa position.
  useEffect(() => {
    if (!loaded || !location.hash) return
    const nav = performance.getEntriesByType?.('navigation')?.[0]
    if (nav && nav.type !== 'navigate') return
    document.getElementById(decodeURIComponent(location.hash.slice(1)))?.scrollIntoView({ behavior: 'instant', block: 'start' })
  }, [loaded])

  // En développement, le <head> n'est pas pré-rendu : on pose au moins le titre
  useEffect(() => {
    if (import.meta.env.DEV) document.title = route.title
  }, [route])

  return (
    <RouteProvider path={path} route={route}>
      <ParcoursProvider>
        <Background />
        {route.loader && <Loader done={loaded} />}
        <Cursor />
        <ThermalRail />
        <Nav />
        <main id="contenu">
          <route.Page loaded={loaded} />
        </main>
        <Footer />
        <StickyCta />
        <Analytics />
      </ParcoursProvider>
    </RouteProvider>
  )
}
