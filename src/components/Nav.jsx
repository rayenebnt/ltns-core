import { useEffect, useState } from 'react'

export default function Nav() {
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 50)
    window.addEventListener('scroll', onScroll)
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <nav className={scrolled ? 'scrolled' : ''}>
      <a href="#" className="logo" aria-label="LTNS° accueil">
        LTNS<span className="deg">°</span>
      </a>
      <ul className="nav-links">
        <li><a href="#services">services</a></li>
        <li><a href="#process">process</a></li>
        <li><a href="#faq">faq</a></li>
      </ul>
      <a href="#contact" className="nav-cta">Devis gratuit →</a>
    </nav>
  )
}
