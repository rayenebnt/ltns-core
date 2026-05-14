import { useEffect, useState } from 'react'
import Background from './components/Background'
import Loader from './components/Loader'
import Cursor from './components/Cursor'
import Nav from './components/Nav'
import Hero from './components/Hero'
import Pourquoi from './components/Pourquoi'
import Services from './components/Services'
import Process from './components/Process'
import Faq from './components/Faq'
import Contact from './components/Contact'
import Footer from './components/Footer'
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

export default function App() {
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    const t = setTimeout(() => setLoaded(true), 1200)
    return () => clearTimeout(t)
  }, [])

  useReveal(loaded)
  useThermal()

  return (
    <>
      <Background />
      <Loader done={loaded} />
      <Cursor />
      <ThermalRail />
      <Nav />
      <Hero loaded={loaded} />
      <Pourquoi />
      <Services />
      <Process />
      <Faq />
      <Contact />
      <Footer />
    </>
  )
}
