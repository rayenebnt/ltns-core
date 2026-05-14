import { useEffect, useState } from 'react'

function fmtUtc(d) {
  const hh = String(d.getUTCHours()).padStart(2, '0')
  const mm = String(d.getUTCMinutes()).padStart(2, '0')
  return `${hh}:${mm} UTC`
}

export default function Footer() {
  const [time, setTime] = useState(() => fmtUtc(new Date()))
  const [temp, setTemp] = useState('12.0')

  useEffect(() => {
    const id = setInterval(() => {
      setTime(fmtUtc(new Date()))
      const t = getComputedStyle(document.documentElement).getPropertyValue('--temp').trim()
      if (t) setTemp(t)
    }, 500)
    return () => clearInterval(id)
  }, [])

  return (
    <footer>
      <div className="footer-inner">
        <div>
          <div className="footer-logo">LTNS<span className="deg">°</span></div>
          <div className="footer-tag">LE WEB AU BON DEGRÉ</div>
        </div>
        <div className="footer-meta">
          <a href="#services">SERVICES</a>
          <a href="#process">PROCESS</a>
          <a href="#tarifs">TARIFS</a>
          <a href="#faq">FAQ</a>
          <a href="#contact">CONTACT</a>
        </div>
        <div className="footer-readout">
          <div>T<span style={{ color: 'var(--fg-mute)' }}>·</span><b>{temp}°</b></div>
          <div>{time}</div>
          <div>UNIT <b>LTNS-01</b></div>
          <div style={{ color: '#39ff14' }}>● AVAILABLE</div>
        </div>
      </div>
      <div className="footer-bottom">
        <span>© {new Date().getFullYear()} LTNS° · TOUS DROITS RÉSERVÉS</span>
        <span>BUILT WITH PRECISION · CALIBRÉ À 99.0°</span>
      </div>
    </footer>
  )
}
