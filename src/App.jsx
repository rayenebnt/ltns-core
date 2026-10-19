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
      <div className="thermal-rail-label" aria-hidden="true" data-nosnippet="">CHAUFFE</div>
    </>
  )
}

export default function App({ path }) {
  const route = resolve(path)
  const [loaded, setLoaded] = useState(false)
  const [loaderGone, setLoaderGone] = useState(false)

  useEffect(() => {
    const t = setTimeout(() => setLoaded(true), 250)
    return () => clearTimeout(t)
  }, [])

  // L'écran de chauffe quitte la page une fois son fondu (0,6 s) terminé
  useEffect(() => {
    if (!loaded) return
    const id = setTimeout(() => setLoaderGone(true), 700)
    return () => clearTimeout(id)
  }, [loaded])

  // Les animations CSS en boucle d'un bloc hors de l'écran sont mises en pause
  useEffect(() => {
    const io = new IntersectionObserver(entries => {
      entries.forEach(e => e.target.classList.toggle('anim-paused', !e.isIntersecting))
    }, { rootMargin: '200px 0px' })
    document.querySelectorAll('header.hero, header.page-hero, section, footer').forEach(el => io.observe(el))
    return () => io.disconnect()
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

  // Défilement doux des liens internes, seulement une fois la page prête.
  // Actif dès le chargement, il rendait animés le saut natif vers l'ancre et la
  // reprise de position au rechargement, et le saut ci-dessus tombait à côté.
  useEffect(() => {
    if (loaded) document.documentElement.classList.add('smooth-scroll')
  }, [loaded])

  // En développement, le <head> n'est pas pré-rendu : on pose au moins le titre
  useEffect(() => {
    if (import.meta.env.DEV) document.title = route.title
  }, [route])

  return (
    <RouteProvider path={path} route={route}>
      <ParcoursProvider>
        <Background />
        {route.loader && !loaderGone && <Loader done={loaded} />}
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
