import { useRef } from 'react'
import { PROJECT_TYPES, requestQuote } from '../data/projects'

const services = [
  { id: 'S01', temp: '34°', title: 'Sites de présentation', desc: 'Particuliers, artisans, indépendants : un site élégant et efficace pour vous présenter en ligne.', tag: 'DEVIS GRATUIT', projet: PROJECT_TYPES.VITRINE },
  { id: 'S02', temp: '48°', title: 'Sites professionnels', desc: 'PME, entreprises, associations : un site complet avec pages personnalisées et fonctionnalités sur-mesure.', tag: 'SUR-MESURE', projet: PROJECT_TYPES.PRO },
  { id: 'S03', temp: '62°', title: 'Sites avec base de données', desc: 'Espaces membres, back-office, e-commerce custom : architecture backend solide et évolutive.', tag: 'SUR-MESURE', projet: PROJECT_TYPES.BDD },
  { id: 'S04', temp: '74°', title: 'Logiciels sur-mesure', desc: 'Outils métier, applications desktop, automatisations : des solutions taillées pour vos processus internes.', tag: 'SUR-MESURE', projet: PROJECT_TYPES.LOGICIEL },
  { id: 'S05', temp: '86°', title: 'Applications mobiles', desc: 'Applications iOS et Android développées sur-mesure pour vos clients ou vos équipes.', tag: 'SUR-MESURE', projet: PROJECT_TYPES.MOBILE },
  { id: 'S06', temp: '92°', title: 'Design UI/UX', desc: 'Maquettes, identité visuelle, expérience utilisateur. Un design qui sert votre image et vos objectifs.', tag: 'SUR-MESURE', projet: PROJECT_TYPES.DESIGN }
]

function ServiceCard({ id, temp, title, desc, tag, projet }) {
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
      {/* Le lien couvre toute la carte (::after) : elle est cliquable en
          entier, tout en gardant un intitulé de lien explicite. */}
      <h3>
        <a href="#contact" onClick={() => requestQuote(projet)}>
          {title}
          <span className="sr-only"> — demander un devis</span>
        </a>
      </h3>
      <p>{desc}</p>
      <div className="service-meta">
        <span className="tag">{tag}</span>
        <span className="service-cta">Demander un devis <span className="arrow">→</span></span>
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
            <b className="section-hint"> Cliquez sur une gamme pour lancer un devis.</b>
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
