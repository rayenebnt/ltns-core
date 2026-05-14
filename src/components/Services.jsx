import { useRef } from 'react'

const services = [
  { icon: '🏠', title: 'Sites de présentation', desc: 'Pour particuliers, artisans et indépendants : un site élégant et efficace pour vous présenter en ligne.', tag: 'Devis gratuit' },
  { icon: '💼', title: 'Sites professionnels', desc: 'Pour PME, entreprises et associations : un site complet avec pages personnalisées et fonctionnalités sur-mesure.', tag: 'Sur-mesure' },
  { icon: '🗄️', title: 'Sites avec base de données', desc: 'Espaces membres, back-office, e-commerce custom : des projets qui nécessitent une vraie architecture backend.', tag: 'Sur-mesure' },
  { icon: '💻', title: 'Logiciels sur-mesure', desc: 'Outils métier, applications desktop, automatisations : des solutions conçues pour vos processus internes.', tag: 'Sur-mesure' },
  { icon: '📱', title: 'Applications mobiles', desc: 'Applications iOS et Android développées sur-mesure pour vos clients ou vos équipes.', tag: 'Sur-mesure' },
  { icon: '🎨', title: 'Design UI/UX', desc: 'Maquettes, identité visuelle, expérience utilisateur. Un design qui sert votre image et vos objectifs.', tag: 'Sur-mesure' }
]

function ServiceCard({ icon, title, desc, tag }) {
  const ref = useRef(null)

  const onMouseMove = (e) => {
    const card = ref.current
    if (!card) return
    const r = card.getBoundingClientRect()
    const x = e.clientX - r.left
    const y = e.clientY - r.top
    const rx = ((y / r.height) - 0.5) * -8
    const ry = ((x / r.width) - 0.5) * 8
    card.style.transform = `translateY(-4px) perspective(900px) rotateX(${rx}deg) rotateY(${ry}deg)`
    card.style.setProperty('--mx', x + 'px')
    card.style.setProperty('--my', y + 'px')
  }

  const onMouseLeave = () => {
    if (ref.current) ref.current.style.transform = ''
  }

  return (
    <article className="service" ref={ref} onMouseMove={onMouseMove} onMouseLeave={onMouseLeave}>
      <div className="service-icon">{icon}</div>
      <h3>{title}</h3>
      <p>{desc}</p>
      <span className="tag">{tag}</span>
    </article>
  )
}

export default function Services() {
  return (
    <section id="services">
      <div className="reveal">
        <span className="section-label">02 — services</span>
        <h2 className="section-title">Sites, logiciels, apps. <em>Un seul interlocuteur.</em></h2>
        <p className="section-intro">
          De la vitrine web à l'application mobile, en passant par les logiciels métier
          — tout est fait sur-mesure, sans compromis sur la qualité.
        </p>
      </div>
      <div className="services-grid reveal">
        {services.map((s, i) => <ServiceCard key={i} {...s} />)}
      </div>
    </section>
  )
}
