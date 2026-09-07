import { PROJECT_TYPES, requestQuote } from '../data/projects'

const formules = [
  {
    code: 'T01 · TIÈDE',
    aside: '5 jours',
    name: 'Essentiel',
    temp: '38',
    price: <>à partir de <b>490€</b> TTC</>,
    from: 'Site one-page · livré rapide',
    features: [
      'Site one-page responsive',
      'Design sur-mesure',
      'Formulaire de contact',
      'Hébergement 1ʳᵉ année offert',
      'SEO de base inclus',
    ],
    projet: PROJECT_TYPES.VITRINE,
    cta: 'Choisir Essentiel',
    variant: 'btn-ghost',
  },
  {
    code: 'T02 · CHAUD',
    badge: 'POPULAIRE',
    name: 'Pro',
    temp: '66',
    price: <>à partir de <b>990€</b> TTC</>,
    from: 'Site multi-pages · régime nominal',
    features: [
      'Site multi-pages (jusqu\'à 6)',
      'Design & UX avancés',
      'Animations sur-mesure',
      'Espace admin / blog',
      'SEO optimisé + Analytics',
      'Hébergement 1ʳᵉ année offert',
    ],
    projet: PROJECT_TYPES.PRO,
    cta: 'Choisir Pro',
    variant: 'btn-primary',
    featured: true,
  },
  {
    code: 'T03 · BRÛLANT',
    aside: 'devis',
    name: 'Sur-mesure',
    temp: '99',
    price: <>devis <b>personnalisé</b></>,
    from: 'Logiciels · apps · projets complexes',
    features: [
      'E-commerce complet',
      'Fonctionnalités spécifiques',
      'Intégrations API / CRM',
      'Maintenance long-terme',
      'Stratégie SEO avancée',
    ],
    projet: PROJECT_TYPES.AUTRE,
    cta: 'Discutons-en',
    variant: 'btn-ghost',
  },
]

export default function Tarifs() {
  return (
    <section id="tarifs">
      <div className="section-head reveal">
        <div>
          <span className="section-label">
            <b>04</b><span className="sep">//</span> TARIFS
          </span>
          <h2 className="section-title">Trois niveaux,<br/><em>une promesse</em>.</h2>
          <p className="section-intro">
            Tarifs transparents pour chaque projet. Tout reste négociable selon vos besoins réels —
            chauffe ajustable à la demande.
          </p>
        </div>
        <div className="section-temp">
          84<span className="deg">°</span>
          <span className="label">RÉGIME · CHAUD</span>
        </div>
      </div>

      <div className="tarifs-grid reveal">
        {formules.map((f) => (
          <div className={`tarif ${f.featured ? 'featured' : ''}`} key={f.name}>
            <div className="tarif-head">
              <span>{f.code}</span>
              {f.badge ? <span className="badge">{f.badge}</span> : <span>{f.aside}</span>}
            </div>
            <div className="tarif-name">{f.name}</div>
            <div className="tarif-temp" aria-hidden="true">{f.temp}<span className="deg">°</span></div>
            <div className="tarif-price">{f.price}</div>
            <span className="tarif-from">{f.from}</span>
            <ul>
              {f.features.map((item) => <li key={item}>{item}</li>)}
            </ul>
            <a
              href="#contact"
              className={`btn ${f.variant}`}
              onClick={() => requestQuote(f.projet)}
            >
              {f.cta} <span className="arrow">→</span>
            </a>
          </div>
        ))}
      </div>

      <p className="tarifs-note reveal">
        Les prix affichés sont des points de départ, pas des grilles fermées.
        Le devis final dépend du périmètre réel — il est gratuit, détaillé, et sans engagement.
      </p>
    </section>
  )
}
