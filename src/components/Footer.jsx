import { useEffect, useState } from 'react'
import { NAV_LINKS } from '../data/nav'
import { useTemp } from '../hooks/useThermal'

function fmtUtc(d) {
  const hh = String(d.getUTCHours()).padStart(2, '0')
  const mm = String(d.getUTCMinutes()).padStart(2, '0')
  return `${hh}:${mm}`
}

export default function Footer() {
  const [time, setTime] = useState(() => fmtUtc(new Date()))
  const temp = useTemp()

  useEffect(() => {
    const id = setInterval(() => setTime(fmtUtc(new Date())), 15000)
    return () => clearInterval(id)
  }, [])

  return (
    <footer>
      <div className="footer-inner">
        <div>
          <a href="#top" className="footer-logo" aria-label="LTNS° — retour en haut de page">
            LTNS<span className="deg">°</span>
          </a>
          <div className="footer-tag">LE WEB AU BON DEGRÉ</div>
        </div>
        <nav className="footer-meta" aria-label="Navigation de bas de page">
          {NAV_LINKS.map((l) => (
            <a href={`#${l.id}`} key={l.id}>{l.label}</a>
          ))}
        </nav>
        <div className="footer-readout" aria-hidden="true">
          <div>T<span style={{ color: 'var(--fg-mute)' }}>·</span><b>{temp}°</b></div>
          <div>UTC · {time}</div>
          <div>UNIT <b>LTNS-01</b></div>
          <div style={{ color: '#39ff14' }}>● DISPONIBLE</div>
        </div>
      </div>
      <div className="footer-bottom">
        <span>© {new Date().getFullYear()} LTNS° · TOUS DROITS RÉSERVÉS</span>
        <span>BUILT WITH PRECISION · CALIBRÉ À 99.0°</span>
      </div>
    </footer>
  )
}
