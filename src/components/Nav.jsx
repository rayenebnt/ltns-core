import { useEffect, useRef, useState } from 'react'
import { NAV_LINKS, NAV_IDS } from '../data/nav'
import useActiveSection from '../hooks/useActiveSection'
import { useTemp, useScrollProgress } from '../hooks/useThermal'

function fmtTime(d) {
  const hh = String(d.getUTCHours()).padStart(2, '0')
  const mm = String(d.getUTCMinutes()).padStart(2, '0')
  const ss = String(d.getUTCSeconds()).padStart(2, '0')
  return `${hh}:${mm}:${ss}`
}

export default function Nav() {
  const [scrolled, setScrolled] = useState(false)
  const [open, setOpen] = useState(false)
  const [time, setTime] = useState(() => fmtTime(new Date()))
  const temp = useTemp()
  const progress = useScrollProgress()
  const active = useActiveSection(NAV_IDS)
  const burgerRef = useRef(null)
  const panelRef = useRef(null)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 50)
    const id = setInterval(() => setTime(fmtTime(new Date())), 1000)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      clearInterval(id)
      window.removeEventListener('scroll', onScroll)
    }
  }, [])

  // Menu mobile : Échap ferme, le scroll de la page est bloqué,
  // et le focus part dans le panneau puis revient sur le bouton.
  useEffect(() => {
    if (!open) return

    const onKey = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        setOpen(false)
      }
    }

    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    document.addEventListener('keydown', onKey)
    panelRef.current?.querySelector('a')?.focus()

    return () => {
      document.body.style.overflow = prevOverflow
      document.removeEventListener('keydown', onKey)
      burgerRef.current?.focus()
    }
  }, [open])

  // Au-delà du breakpoint mobile, le panneau n'a plus lieu d'être ouvert.
  useEffect(() => {
    const mq = window.matchMedia('(min-width: 901px)')
    const sync = (e) => { if (e.matches) setOpen(false) }
    mq.addEventListener('change', sync)
    return () => mq.removeEventListener('change', sync)
  }, [])

  return (
    <>
      <nav className={`site-nav ${scrolled ? 'scrolled' : ''}`} aria-label="Navigation principale">
        <div className="nav-left">
          <a href="#top" className="logo" aria-label="LTNS° — retour en haut de page">
            LTNS<span className="deg">°</span>
          </a>
          <span className="nav-status">DISPONIBLE</span>
        </div>

        <div className="nav-readout" aria-hidden="true">
          <span>T<span className="sep">·</span><b>{temp}°</b></span>
          <span className="sep">//</span>
          <span>UTC<span className="sep">·</span><b>{time}</b></span>
          <span className="sep">//</span>
          <span>v1.0</span>
        </div>

        <div className="nav-right">
          <ul className="nav-links">
            {NAV_LINKS.filter((l) => l.id !== 'contact').map((l) => (
              <li key={l.id}>
                <a href={`#${l.id}`} aria-current={active === l.id ? 'true' : undefined}>
                  {l.label}
                </a>
              </li>
            ))}
          </ul>

          <a
            href="#contact"
            className="nav-cta"
            aria-current={active === 'contact' ? 'true' : undefined}
          >
            Devis gratuit<span className="arrow">→</span>
          </a>

          <button
            type="button"
            className={`nav-burger ${open ? 'open' : ''}`}
            ref={burgerRef}
            aria-expanded={open}
            aria-controls="nav-panel"
            aria-label={open ? 'Fermer le menu' : 'Ouvrir le menu'}
            onClick={() => setOpen((v) => !v)}
          >
            <span aria-hidden="true"></span>
            <span aria-hidden="true"></span>
          </button>
        </div>

        {/* Progression de lecture — visible partout, y compris sur mobile
            où la réglette thermique latérale est masquée. */}
        <div className="nav-progress" aria-hidden="true" style={{ '--p': progress }}></div>
      </nav>

      <div
        className={`nav-backdrop ${open ? 'open' : ''}`}
        onClick={() => setOpen(false)}
        aria-hidden="true"
      ></div>

      <div
        id="nav-panel"
        className={`nav-panel ${open ? 'open' : ''}`}
        ref={panelRef}
        aria-label="Menu"
      >
        <ul>
          {NAV_LINKS.map((l, i) => (
            <li key={l.id}>
              <a
                href={`#${l.id}`}
                onClick={() => setOpen(false)}
                aria-current={active === l.id ? 'true' : undefined}
              >
                <span className="idx">{String(i + 1).padStart(2, '0')}</span>
                <span>{l.label}</span>
                <span className="arrow" aria-hidden="true">→</span>
              </a>
            </li>
          ))}
        </ul>
        <a href="#contact" className="btn btn-primary nav-panel-cta" onClick={() => setOpen(false)}>
          Demander un devis <span className="arrow">→</span>
        </a>
        <div className="nav-panel-foot">
          <span>T·<b>{temp}°</b></span>
          <span>UTC·<b>{time}</b></span>
        </div>
      </div>
    </>
  )
}
