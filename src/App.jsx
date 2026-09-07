import { useEffect, useState } from 'react'
import Background from './components/Background'
import Loader from './components/Loader'
import Cursor from './components/Cursor'
import Nav from './components/Nav'
import Hero from './components/Hero'
import Pourquoi from './components/Pourquoi'
import Services from './components/Services'
import Process from './components/Process'
import Tarifs from './components/Tarifs'
import Faq from './components/Faq'
import Contact from './components/Contact'
import Footer from './components/Footer'
import BackToTop from './components/BackToTop'
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

// L'écran de chargement est un effet de marque, pas une étape utile :
// on ne le rejoue ni pour un visiteur qui revient dans la même session,
// ni pour quelqu'un qui a demandé à réduire les animations.
function shouldSkipLoader() {
  if (typeof window === 'undefined') return true
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return true
  try {
    return sessionStorage.getItem('ltns-booted') === '1'
  } catch {
    return false
  }
}

export default function App() {
  const [skip] = useState(shouldSkipLoader)
  const [loaded, setLoaded] = useState(skip)

  useEffect(() => {
    try { sessionStorage.setItem('ltns-booted', '1') } catch { /* mode privé */ }
    if (skip) return
    const t = setTimeout(() => setLoaded(true), 1200)
    return () => clearTimeout(t)
  }, [skip])

  useReveal(loaded)
  useThermal()

  return (
    <>
      <a href="#contenu" className="skip-link">Aller au contenu</a>
      <Background />
      {!skip && <Loader done={loaded} />}
      <Cursor />
      <ThermalRail />
      <Nav />
      <main id="contenu" tabIndex={-1}>
        <Hero loaded={loaded} />
        <Pourquoi />
        <Services />
        <Process />
        <Tarifs />
        <Faq />
        <Contact />
      </main>
      <Footer />
      <BackToTop />
    </>
  )
}
