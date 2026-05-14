import { useEffect, useRef, useState } from 'react'
import { gsap } from 'gsap'

const SCALE_TICKS = [
  { v: '99°', label: 'MAX', now: false },
  { v: '80°', label: '', now: false },
  { v: '60°', label: 'TARGET', now: true },
  { v: '40°', label: '', now: false },
  { v: '20°', label: '', now: false },
  { v: '12°', label: 'MIN', now: false },
]

export default function Hero({ loaded }) {
  const ref = useRef(null)
  const tempRef = useRef(null)
  const [now] = useState(() => {
    const d = new Date()
    const dd = String(d.getDate()).padStart(2, '0')
    const mm = String(d.getMonth() + 1).padStart(2, '0')
    const yy = d.getFullYear()
    return `${dd}.${mm}.${yy}`
  })

  // Animation : readout principal qui chauffe légèrement en hero
  useEffect(() => {
    const el = tempRef.current
    if (!el) return
    const target = 38.0
    let raf
    const start = performance.now()
    const dur = 1400
    const tick = (now) => {
      const k = Math.min(1, (now - start) / dur)
      const eased = 1 - Math.pow(1 - k, 3)
      el.textContent = (12 + (target - 12) * eased).toFixed(1)
      if (k < 1) raf = requestAnimationFrame(tick)
    }
    if (loaded) raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [loaded])

  // Entrée GSAP
  useEffect(() => {
    if (!loaded) return
    const tl = gsap.timeline()
    tl.from('.hero-scale .tick', { opacity: 0, x: -10, duration: 0.5, stagger: 0.04, ease: 'power2.out' })
      .from('.hero-tag', { y: 14, opacity: 0, duration: 0.6, ease: 'power3.out' }, '-=0.2')
      .from('.hero h1 .line span', { y: '110%', duration: 1.0, stagger: 0.1, ease: 'power4.out' }, '-=0.3')
      .from('.hero-sub', { y: 14, opacity: 0, duration: 0.7, ease: 'power3.out' }, '-=0.5')
      .from('.hero-ctas .btn', { y: 14, opacity: 0, duration: 0.5, stagger: 0.08, ease: 'power3.out' }, '-=0.4')
      .from('.hero-readout > *', { opacity: 0, x: 14, duration: 0.6, stagger: 0.08, ease: 'power3.out' }, '-=0.6')
      .from('nav', { y: -28, opacity: 0, duration: 0.7, ease: 'power3.out' }, '-=0.8')
  }, [loaded])

  return (
    <header className="hero" ref={ref}>
      <div className="hero-scale" aria-hidden="true">
        {SCALE_TICKS.map((t, i) => (
          <span className={`tick ${t.now ? 'now' : ''}`} key={i}>
            {t.v}{t.label && <span style={{ marginLeft: 8, opacity: 0.6 }}>· {t.label}</span>}
          </span>
        ))}
      </div>

      <div className="hero-main">
        <span className="hero-tag">SIGNAL ACQUIS · DISPONIBLE</span>
        <h1>
          <span className="line"><span>LE WEB</span></span>
          <span className="line"><span>AU <em>BON</em></span></span>
          <span className="line r"><span>DEGRÉ<span className="deg-mark">°</span></span></span>
        </h1>
        <p className="hero-sub">
          LTNS<span className="deg-mark" style={{ color: 'var(--accent)' }}>°</span> — Sites, logiciels et applications mobiles taillés pour
          particuliers et professionnels. <b>Calibrés au bon degré.</b> Pas de template,
          pas d'à-peu-près — chaque ligne est réglée à la main.
        </p>
        <div className="hero-ctas">
          <a href="#services" className="btn btn-primary">
            Services <span className="arrow">→</span>
          </a>
          <a href="#contact" className="btn btn-ghost">
            Demander un devis <span className="arrow">→</span>
          </a>
        </div>
      </div>

      <aside className="hero-readout" aria-hidden="true">
        <div>
          <div>TEMP · NOW</div>
          <div className="big"><span ref={tempRef}>12.0</span><span className="deg">°</span></div>
        </div>
        <div className="grid-coord">
          <span>DATE</span><b>{now}</b>
          <span>UNIT</span><b>LTNS-01</b>
          <span>MODE</span><b>FREELANCE</b>
          <span>STATUS</span><b style={{ color: '#39ff14' }}>● READY</b>
        </div>
      </aside>

      <div className="hero-scroll">SCROLL · CHAUFFE</div>
    </header>
  )
}
