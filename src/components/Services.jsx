import { useRef } from 'react'

const services = [
  { id: 'S01', temp: '34°', title: 'Sites de présentation', desc: 'Particuliers, artisans, indépendants : un site élégant et efficace pour vous présenter en ligne.', tag: 'DEVIS GRATUIT' },
  { id: 'S02', temp: '48°', title: 'Sites professionnels', desc: 'PME, entreprises, associations : un site complet avec pages personnalisées et fonctionnalités sur-mesure.', tag: 'SUR-MESURE' },
  { id: 'S03', temp: '62°', title: 'Sites avec base de données', desc: 'Espaces membres, back-office, e-commerce custom : architecture backend solide et évolutive.', tag: 'SUR-MESURE' },
  { id: 'S04', temp: '74°', title: 'Logiciels sur-mesure', desc: 'Outils métier, applications desktop, automatisations : des solutions taillées pour vos processus internes.', tag: 'SUR-MESURE' },
  { id: 'S05', temp: '86°', title: 'Applications mobiles', desc: 'Applications iOS et Android développées sur-mesure pour vos clients ou vos équipes.', tag: 'SUR-MESURE' },
  { id: 'S06', temp: '92°', title: 'Design UI/UX', desc: 'Maquettes, identité visuelle, expérience utilisateur. Un design qui sert votre image et vos objectifs.', tag: 'SUR-MESURE' }
]

function ServiceCard({ id, temp, title, desc, tag }) {
  const ref = useRef(null)

  const onMouseMove = (e) => {
    const card = ref.current
    if (!card) return
    const r = card.getBoundingClientRect()
    card.style.setProperty('--mx', (e.clientX - r.left) + 'px')
    card.style.setProperty('--my', (e.clientY - r.top) + 'px')
  }

  return (
    <article className="service" ref={ref} onMouseMove={onMouseMove}>
      <div className="service-head">
        <span>{id}</span>
        <span className="service-temp">{temp}</span>
      </div>
      <h3>{title}</h3>
      <p>{desc}</p>
      <div className="service-meta">
        <span className="tag">{tag}</span>
        <span className="arrow">→</span>
      </div>
    </article>
  )
}

export default function Services() {
  return (
    <section id="services">
      <div className="section-head reveal">
        <div>
          <span className="section-label">
            <b>02</b><span className="sep">//</span> SERVICES
          </span>
          <h2 className="section-title">Six gammes,<br/><em>un seul artisan</em>.</h2>
          <p className="section-intro">
            De la vitrine web à l'application mobile, en passant par les logiciels métier —
            tout est fait sur-mesure, sans compromis sur la qualité.
          </p>
        </div>
        <div className="section-temp">
          48<span className="deg">°</span>
          <span className="label">PUISSANCE · MONTANTE</span>
        </div>
      </div>
      <div className="services-grid reveal">
        {services.map(s => <ServiceCard key={s.id} {...s} />)}
      </div>
    </section>
  )
}
