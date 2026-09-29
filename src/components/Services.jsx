import { useRef } from 'react'
import { prefillDevis } from './Contact'

const services = [
  { id: 'S01', projet: 'Site de présentation', temp: '34°', title: 'Sites de présentation', desc: 'Artisans, indépendants, particuliers : un site simple et soigné pour vous faire connaître et être trouvé sur internet.', tag: 'DEVIS GRATUIT' },
  { id: 'S02', projet: 'Site de présentation', temp: '48°', title: 'Sites d\'entreprise', desc: 'Entreprises et associations : un site à plusieurs pages, avec les fonctions dont vous avez vraiment besoin.', tag: 'SUR-MESURE' },
  { id: 'S03', projet: 'Site avec boutique ou espace client', temp: '62°', title: 'Boutiques et espaces clients', desc: 'Vendre en ligne, créer des comptes clients, gérer vos contenus vous-même : un site qui garde vos informations en sécurité.', tag: 'SUR-MESURE' },
  { id: 'S04', projet: 'Logiciel pour mon métier', temp: '74°', title: 'Logiciels sur-mesure', desc: 'Un outil pensé pour votre métier : gérer vos clients, vos stocks, vos plannings, et automatiser ce qui vous prend du temps.', tag: 'SUR-MESURE' },
  { id: 'S05', projet: 'Application mobile', temp: '86°', title: 'Applications mobiles', desc: 'Une application sur iPhone et Android, créée pour vos clients ou pour votre équipe.', tag: 'SUR-MESURE' },
  { id: 'S06', projet: 'Autre', temp: '92°', title: 'Design et identité', desc: 'Logo, couleurs, maquettes : une image qui vous ressemble et un site où l\'on trouve tout du premier coup.', tag: 'SUR-MESURE' }
]

function ServiceCard({ id, projet, temp, title, desc, tag }) {
  const ref = useRef(null)

  const onMouseMove = (e) => {
    const card = ref.current
    if (!card) return
    const r = card.getBoundingClientRect()
    card.style.setProperty('--mx', (e.clientX - r.left) + 'px')
    card.style.setProperty('--my', (e.clientY - r.top) + 'px')
  }

  return (
    <a href="#contact" className="service" ref={ref} onMouseMove={onMouseMove} onClick={() => prefillDevis(projet)}>
      <div className="service-head">
        <span>{id}</span>
        <span className="service-temp">{temp}</span>
      </div>
      <h3>{title}</h3>
      <p>{desc}</p>
      <div className="service-meta">
        <span className="tag">{tag}</span>
        <span className="service-cta">Demander un devis <span className="arrow">→</span></span>
      </div>
    </a>
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
          <h2 className="section-title">Six services,<br/><em>un seul artisan</em>.</h2>
          <p className="section-intro">
            Du petit site de présentation à l'application mobile : tout est créé
            pour vous, à la main, jamais copié d'un modèle tout prêt.
          </p>
        </div>
        <div className="section-temp">
          34<span className="deg">°</span>
          <span className="label">DU SIMPLE AU COMPLET</span>
        </div>
      </div>
      <div className="services-grid reveal">
        {services.map(s => <ServiceCard key={s.id} {...s} />)}
      </div>
    </section>
  )
}
