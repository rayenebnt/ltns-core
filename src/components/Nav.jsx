import { useEffect, useState } from 'react'
import ParcoursTrigger from './ParcoursTrigger'
import { useIsHome, useSectionHref } from '../lib/route'
import { subscribeThermal, thermal } from '../hooks/useThermal'

function fmtTime(d) {
  const hh = String(d.getHours()).padStart(2, '0')
  const mm = String(d.getMinutes()).padStart(2, '0')
  const ss = String(d.getSeconds()).padStart(2, '0')
  return `${hh}:${mm}:${ss}`
}

export default function Nav() {
  const [scrolled, setScrolled] = useState(false)
  const [time, setTime] = useState('--:--:--')
  const [temp, setTemp] = useState('12.0')
  const href = useSectionHref()
  const isHome = useIsHome()

  // Heure lue dans le navigateur seulement : le HTML pré-rendu affiche --:--:--
  // Une mise à jour par seconde, calée sur le changement de seconde.
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 50)
    let id
    const tick = () => {
      setTime(fmtTime(new Date()))
      id = setTimeout(tick, 1000 - (Date.now() % 1000) + 5)
    }
    tick()
    onScroll()
    setTemp(thermal.temp)
    const unsubscribe = subscribeThermal(s => setTemp(s.temp))
    window.addEventListener('scroll', onScroll)
    return () => {
      clearTimeout(id)
      unsubscribe()
      window.removeEventListener('scroll', onScroll)
    }
  }, [])

  return (
    <nav className={scrolled ? 'scrolled' : ''}>
      <div className="nav-left">
        <a href={isHome ? '#' : '/'} className="logo" aria-label="LTNS° accueil">
          LTNS<span className="deg">°</span>
        </a>
        <span className="nav-status">DISPONIBLE</span>
      </div>

      <div className="nav-readout">
        <span>T<span className="sep">·</span><b>{temp}°</b></span>
        <span className="sep">//</span>
        <span>HEURE<span className="sep">·</span><b>{time}</b></span>
        <span className="sep">//</span>
        <span>v1.0</span>
      </div>

      <div className="nav-right">
        <ParcoursTrigger variant="nav" />
        <ul className="nav-links">
          <li><a href={href('tarifs')}>tarifs</a></li>
          <li><a href={href('realisations')}>réalisations</a></li>
          <li><a href={href('services')}>services</a></li>
          <li><a href={href('process')}>process</a></li>
          <li><a href={href('faq')}>faq</a></li>
        </ul>
        {/* Sur téléphone, les liens sont masqués : on garde un accès direct aux tarifs */}
        <a href={href('tarifs')} className="nav-cta nav-tarifs">Tarifs</a>
        <a href={href('contact')} className="nav-cta">Devis<span className="arrow">→</span></a>
      </div>
    </nav>
  )
}
