import { useRef, useState } from 'react'

const projects = [
  {
    id: 'P01',
    year: '2025',
    name: 'RBTI',
    url: 'https://rbti.fr',
    domain: 'rbti.fr',
    type: 'Sous-location immobilière',
    tag: 'SITE DE PRÉSENTATION',
    description:
      'Site de présentation pour une activité de sous-location immobilière : offre, biens et mise en relation propriétaires / locataires, avec un parcours de contact direct.',
    image: '/realisations/rbti.jpg',
    bg: 'linear-gradient(135deg, #00101c 0%, #00223c 50%, #00080e 100%)',
    hi: '#38bdf8',
  },
  {
    id: 'P02',
    year: '2025',
    name: 'PMSB',
    url: 'https://pmsbbatiment.fr',
    domain: 'pmsbbatiment.fr',
    type: 'Bâtiment & rénovation',
    tag: 'SITE VITRINE',
    description:
      "Prestations Multi Services Bâtiment — entreprise de travaux tous corps d'état en Île-de-France. Site vitrine des prestations (ravalement de façade, isolation, peinture intérieure, rénovation complète), avec galerie de chantiers et demande de devis.",
    image: '/realisations/pmsb.jpg',
    bg: 'linear-gradient(135deg, #1c1206 0%, #3a2409 50%, #0e0803 100%)',
    hi: '#f59e0b',
  },
]

/* Aperçu généré : sert de repli tant que la photo du site n'est pas déposée
   dans public/realisations/, ou si elle échoue au chargement. */
function MockPreview({ bg, hi }) {
  return (
    <div className="realisation-mock" style={{ background: bg }}>
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
      <div className="mock-cards">
        {[0, 1, 2].map((i) => (
          <div key={i} className="mock-card" style={{ borderColor: `${hi}26`, background: `${hi}0d` }} />
        ))}
      </div>
      <div className="mock-grid" />
    </div>
  )
}

function ProjectCard({ id, year, name, url, domain, type, tag, description, image, bg, hi }) {
  const ref = useRef(null)
  const [hasPhoto, setHasPhoto] = useState(Boolean(image))

  const onMouseMove = (e) => {
    const card = ref.current
    if (!card) return
    const r = card.getBoundingClientRect()
    const x = (e.clientX - r.left) / r.width - 0.5
    const y = (e.clientY - r.top) / r.height - 0.5
    card.style.transform = `perspective(1200px) rotateY(${x * 6}deg) rotateX(${-y * 5}deg) translateZ(10px)`
  }

  const onMouseLeave = () => {
    if (ref.current) ref.current.style.transform = ''
  }

  return (
    <a
      className="realisation"
      ref={ref}
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      onMouseMove={onMouseMove}
      onMouseLeave={onMouseLeave}
    >
      <div className="realisation-screen" style={{ background: bg }}>
        <div className="realisation-chrome" style={{ borderColor: `${hi}20` }}>
          <span className="chrome-dots">
            {[0, 1, 2].map((i) => (
              <i key={i} style={{ background: `${hi}55` }} />
            ))}
          </span>
          <span className="chrome-url">{domain}</span>
        </div>

        <div className="realisation-shot">
          {hasPhoto ? (
            <img
              src={image}
              alt={`Aperçu du site ${name} — ${domain}`}
              loading="lazy"
              decoding="async"
              onError={() => setHasPhoto(false)}
            />
          ) : (
            <MockPreview bg={bg} hi={hi} />
          )}
        </div>

        <div className="realisation-shine" style={{ background: `linear-gradient(180deg, transparent 55%, ${hi}14 100%)` }} />
      </div>

      <div className="realisation-body">
        <div className="realisation-head">
          <span>{id}</span>
          <span>{year}</span>
        </div>
        <h3>{name}</h3>
        <p className="realisation-type">{type}</p>
        <p className="realisation-desc">{description}</p>
        <p className="realisation-url" style={{ color: hi }}>{domain}</p>
        <div className="realisation-footer">
          <span className="tag" style={{ color: hi, borderColor: `${hi}33` }}>{tag}</span>
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
          <h2 className="section-title">Des projets,<br /><em>livrés au degré</em>.</h2>
          <p className="section-intro">
            De la sous-location immobilière aux travaux du bâtiment : chaque site est
            taillé aux besoins du client, sans template générique.
          </p>
        </div>
        <div className="section-temp">
          62<span className="deg">°</span>
          <span className="label">PROJETS · LIVRÉS</span>
        </div>
      </div>

      <div className="realisations-grid reveal">
        {projects.map((p) => (
          <ProjectCard key={p.id} {...p} />
        ))}
      </div>
    </section>
  )
}
