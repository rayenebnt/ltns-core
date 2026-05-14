export default function Tarifs() {
  return (
    <section id="tarifs">
      <div className="reveal">
        <span className="section-label">04 — tarifs</span>
        <h2 className="section-title">Trois formules, <em>une promesse</em>.</h2>
        <p className="section-intro">
          Des tarifs transparents pour chaque projet. Tout est négociable selon vos besoins réels.
        </p>
      </div>
      <div className="tarifs-grid reveal">
        <div className="tarif">
          <div className="tarif-name">Essentiel</div>
          <div className="tarif-price"><span className="currency">€</span>490</div>
          <span className="tarif-from">à partir de · TTC</span>
          <ul>
            <li>Site one-page responsive</li>
            <li>Design sur-mesure</li>
            <li>Formulaire de contact</li>
            <li>Hébergement 1ʳᵉ année offert</li>
            <li>SEO de base inclus</li>
          </ul>
          <a href="#contact" className="btn btn-ghost">Choisir <span className="arrow">→</span></a>
        </div>

        <div className="tarif featured">
          <div className="tarif-name">Pro</div>
          <div className="tarif-price"><span className="currency">€</span>990</div>
          <span className="tarif-from">à partir de · TTC</span>
          <ul>
            <li>Site multi-pages (jusqu'à 6)</li>
            <li>Design & UX avancés</li>
            <li>Animations sur-mesure</li>
            <li>Espace admin / blog</li>
            <li>SEO optimisé + Analytics</li>
            <li>Hébergement 1ʳᵉ année offert</li>
          </ul>
          <a href="#contact" className="btn btn-primary">Choisir <span className="arrow">→</span></a>
        </div>

        <div className="tarif">
          <div className="tarif-name">Sur-mesure</div>
          <div className="tarif-price">€<span style={{ fontSize: '32px' }}>…</span></div>
          <span className="tarif-from">devis personnalisé</span>
          <ul>
            <li>E-commerce complet</li>
            <li>Fonctionnalités spécifiques</li>
            <li>Intégrations API / CRM</li>
            <li>Maintenance long-terme</li>
            <li>Stratégie SEO avancée</li>
          </ul>
          <a href="#contact" className="btn btn-ghost">Discutons-en <span className="arrow">→</span></a>
        </div>
      </div>
    </section>
  )
}
