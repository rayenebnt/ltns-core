import { useRef, useEffect } from 'react'

const projects = [
  {
    id: 'P01', year: '2024',
    name: 'Maison Lefèvre',
    type: 'Boulangerie artisanale',
    tag: 'SITE DE PRÉSENTATION',
    bg: 'linear-gradient(135deg, #1c0a00 0%, #3a1800 50%, #120600 100%)',
    hi: '#fb923c',
  },
  {
    id: 'P02', year: '2024',
    name: 'Studio Mira',
    type: 'Photographe indépendante',
    tag: 'SITE DE PRÉSENTATION',
    bg: 'linear-gradient(135deg, #0d001c 0%, #1e0038 50%, #070010 100%)',
    hi: '#c084fc',
  },
  {
    id: 'P03', year: '2025',
    name: 'Cabinet Tournier',
    type: 'Avocat · Droit des affaires',
    tag: 'SITE PROFESSIONNEL',
    bg: 'linear-gradient(135deg, #001c0a 0%, #003818 50%, #000e04 100%)',
    hi: '#4ade80',
  },
  {
    id: 'P04', year: '2025',
    name: 'Atelier Bois & Co',
    type: 'Menuisier artisan',
    tag: 'SITE DE PRÉSENTATION',
    bg: 'linear-gradient(135deg, #1a1000 0%, #362000 50%, #100a00 100%)',
    hi: '#fbbf24',
  },
  {
    id: 'P05', year: '2025',
    name: 'Dr. Veil',
    type: 'Médecin généraliste',
    tag: 'SITE DE PRÉSENTATION',
    bg: 'linear-gradient(135deg, #00101c 0%, #00223c 50%, #00080e 100%)',
    hi: '#38bdf8',
  },
]

function ProjectCard({ id, year, name, type, tag, bg, hi }) {
  const ref = useRef(null)

  const onMouseMove = (e) => {
    const card = ref.current
    if (!card) return
    const r = card.getBoundingClientRect()
    const x = (e.clientX - r.left) / r.width - 0.5
    const y = (e.clientY - r.top) / r.height - 0.5
    card.style.transform = `perspective(800px) rotateY(${x * 14}deg) rotateX(${-y * 10}deg) translateZ(12px)`
  }

  const onMouseLeave = () => {
    if (ref.current) ref.current.style.transform = ''
  }

  return (
    <article className="realisation" ref={ref} onMouseMove={onMouseMove} onMouseLeave={onMouseLeave}>
      <div className="realisation-screen" style={{ background: bg }}>
        <div className="mock-glow" style={{ background: `radial-gradient(ellipse at 50% 70%, ${hi}30, transparent 65%)` }} />
        <div className="mock-nav" style={{ borderColor: `${hi}28` }}>
          <div className="mock-logo" style={{ background: hi }} />
          <div className="mock-links">
            {[52, 36, 44].map((w, i) => (
              <div key={i} className="mock-link" style={{ width: w, background: `${hi}38` }} />
            ))}
          </div>
        </div>
        <div className="mock-hero">
          <div className="mock-h1" style={{ background: `${hi}70`, width: '72%' }} />
          <div className="mock-h1" style={{ background: `${hi}45`, width: '52%', height: 14 }} />
          <div className="mock-sub" style={{ background: `${hi}28`, width: '60%' }} />
          <div className="mock-sub" style={{ background: `${hi}20`, width: '45%' }} />
          <div className="mock-btn" style={{ background: hi }} />
        </div>
        <div className="mock-grid" />
      </div>

      <div className="realisation-body">
        <div className="realisation-head">
          <span>{id}</span>
          <span>{year}</span>
        </div>
        <h3>{name}</h3>
        <p className="realisation-type">{type}</p>
        <div className="realisation-footer">
          <span className="tag">{tag}</span>
          <span className="realisation-arrow" style={{ color: hi }}>→</span>
        </div>
      </div>
    </article>
  )
}

export default function Realisations() {
  const trackRef = useRef(null)

  useEffect(() => {
    const el = trackRef.current
    if (!el) return
    let isDown = false, startX, scrollLeft

    const down = (e) => {
      isDown = true
      el.classList.add('dragging')
      startX = e.pageX - el.offsetLeft
      scrollLeft = el.scrollLeft
    }
    const up = () => { isDown = false; el.classList.remove('dragging') }
    const move = (e) => {
      if (!isDown) return
      e.preventDefault()
      const x = e.pageX - el.offsetLeft
      el.scrollLeft = scrollLeft - (x - startX) * 1.4
    }

    el.addEventListener('mousedown', down)
    el.addEventListener('mouseleave', up)
    el.addEventListener('mouseup', up)
    el.addEventListener('mousemove', move)
    return () => {
      el.removeEventListener('mousedown', down)
      el.removeEventListener('mouseleave', up)
      el.removeEventListener('mouseup', up)
      el.removeEventListener('mousemove', move)
    }
  }, [])

  return (
    <section id="realisations" className="realisations">
      <div className="section-head reveal">
        <div>
          <span className="section-label">
            <b>04</b><span className="sep">//</span> RÉALISATIONS
          </span>
          <h2 className="section-title">Quelques projets,<br /><em>livrés au degré</em>.</h2>
          <p className="section-intro">
            Sites de présentation, plateformes sur-mesure — chaque projet
            est taillé aux besoins du client, sans template générique.
          </p>
        </div>
        <div className="section-temp">
          62<span className="deg">°</span>
          <span className="label">PROJETS · LIVRÉS</span>
        </div>
      </div>

      <div className="realisations-hint reveal">
        <span>← GLISSER POUR NAVIGUER →</span>
      </div>

      <div className="realisations-track" ref={trackRef}>
        {projects.map(p => <ProjectCard key={p.id} {...p} />)}
      </div>
    </section>
  )
}
