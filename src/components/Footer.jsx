import { useEffect, useState } from 'react'
import { useSectionHref } from '../lib/route'
import { subscribeThermal, thermal } from '../hooks/useThermal'

function fmtUtc(d) {
  const hh = String(d.getHours()).padStart(2, '0')
  const mm = String(d.getMinutes()).padStart(2, '0')
  return `${hh}:${mm}`
}

export default function Footer() {
  const [time, setTime] = useState('--:--')
  const [temp, setTemp] = useState('12.0')
  const [year, setYear] = useState(__BUILD_YEAR__)
  const href = useSectionHref()

  // Heure et année lues dans le navigateur seulement : le HTML pré-rendu reste neutre
  useEffect(() => {
    setTime(fmtUtc(new Date()))
    setYear(new Date().getFullYear())
    setTemp(thermal.temp)
    const unsubscribe = subscribeThermal(s => setTemp(s.temp))
    const id = setInterval(() => setTime(fmtUtc(new Date())), 1000)
    return () => {
      clearInterval(id)
      unsubscribe()
    }
  }, [])

  return (
    <footer>
      <div className="footer-inner">
        <div>
          <div className="footer-logo">LTNS<span className="deg">°</span></div>
          <div className="footer-tag">LE WEB AU BON DEGRÉ</div>
        </div>
        <div className="footer-meta">
          <a href={href('services')}>SERVICES</a>
          <a href={href('process')}>PROCESS</a>
          <a href={href('faq')}>FAQ</a>
          <a href={href('contact')}>CONTACT</a>
        </div>
        <div className="footer-readout" data-nosnippet="">
          <div>T<span style={{ color: 'var(--fg-mute)' }}>·</span><b>{temp}°</b></div>
          <div>{time}</div>
          <div>ATELIER <b>LTNS-01</b></div>
          <div style={{ color: '#16a34a' }}>● DISPONIBLE</div>
        </div>
      </div>
      <div className="footer-bottom">
        <span>© {year} LTNS° · TOUS DROITS RÉSERVÉS</span>
        <span>FAIT MAIN · RÉGLÉ AU DEGRÉ PRÈS</span>
      </div>
    </footer>
  )
}
