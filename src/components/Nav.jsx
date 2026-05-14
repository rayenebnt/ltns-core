import { useEffect, useState } from 'react'

function fmtTime(d) {
  const hh = String(d.getUTCHours()).padStart(2, '0')
  const mm = String(d.getUTCMinutes()).padStart(2, '0')
  const ss = String(d.getUTCSeconds()).padStart(2, '0')
  return `${hh}:${mm}:${ss}`
}

export default function Nav() {
  const [scrolled, setScrolled] = useState(false)
  const [time, setTime] = useState(() => fmtTime(new Date()))
  const [temp, setTemp] = useState('12.0')

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 50)
    const id = setInterval(() => {
      setTime(fmtTime(new Date()))
      const t = getComputedStyle(document.documentElement).getPropertyValue('--temp').trim()
      if (t) setTemp(t)
    }, 250)
    window.addEventListener('scroll', onScroll)
    return () => {
      clearInterval(id)
      window.removeEventListener('scroll', onScroll)
    }
  }, [])

  return (
    <nav className={scrolled ? 'scrolled' : ''}>
      <div className="nav-left">
        <a href="#" className="logo" aria-label="LTNS° accueil">
          LTNS<span className="deg">°</span>
        </a>
        <span className="nav-status">AVAILABLE</span>
      </div>

      <div className="nav-readout">
        <span>T<span className="sep">·</span><b>{temp}°</b></span>
        <span className="sep">//</span>
        <span>UTC<span className="sep">·</span><b>{time}</b></span>
        <span className="sep">//</span>
        <span>v1.0</span>
      </div>

      <div className="nav-right">
        <ul className="nav-links">
          <li><a href="#services">services</a></li>
          <li><a href="#process">process</a></li>
          <li><a href="#tarifs">tarifs</a></li>
          <li><a href="#faq">faq</a></li>
        </ul>
        <a href="#contact" className="nav-cta">Devis<span className="arrow">→</span></a>
      </div>
    </nav>
  )
}
