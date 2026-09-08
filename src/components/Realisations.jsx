import { useRef } from 'react'

const project = {
  id: 'P01',
  year: '2025',
  name: 'RBTI',
  url: 'https://rbti.fr',
  domain: 'rbti.fr',
  type: 'Site vitrine',
  tag: 'SITE DE PRÉSENTATION',
  bg: 'linear-gradient(135deg, #00101c 0%, #00223c 50%, #00080e 100%)',
  hi: '#38bdf8',
}

function ProjectCard({ id, year, name, url, domain, type, tag, bg, hi }) {
  const ref = useRef(null)

  const onMouseMove = (e) => {
    const card = ref.current
    if (!card) return
    const r = card.getBoundingClientRect()
    const x = (e.clientX - r.left) / r.width - 0.5
    const y = (e.clientY - r.top) / r.height - 0.5
    card.style.transform = `perspective(1200px) rotateY(${x * 8}deg) rotateX(${-y * 6}deg) translateZ(10px)`
  }

  const onMouseLeave = () => {
    if (ref.current) ref.current.style.transform = ''
  }

  return (
    <a
      className="realisation realisation-featured"
      ref={ref}
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      onMouseMove={onMouseMove}
      onMouseLeave={onMouseLeave}
    >
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
        <p className="realisation-url" style={{ color: hi }}>{domain}</p>
        <div className="realisation-footer">
          <span className="tag">{tag}</span>
          <span className="realisation-arrow" style={{ color: hi }}>↗</span>
        </div>
      </div>
    </a>
  )
}

export default function Realisations() {
  return (
    <section id="realisations" className="realisations">
      <div className="section-head reveal">
        <div>
          <span className="section-label">
            <b>04</b><span className="sep">//</span> RÉALISATIONS
          </span>
          <h2 className="section-title">Un projet,<br /><em>livré au degré</em>.</h2>
          <p className="section-intro">
            Site de présentation taillé aux besoins du client,
            sans template générique.
          </p>
        </div>
        <div className="section-temp">
          62<span className="deg">°</span>
          <span className="label">PROJET · LIVRÉ</span>
        </div>
      </div>

      <div className="realisations-single reveal">
        <ProjectCard {...project} />
      </div>
    </section>
  )
}
