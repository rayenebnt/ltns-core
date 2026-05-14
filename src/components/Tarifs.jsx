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

        <div className="tarif">
          <div className="tarif-head">
            <span>T01 · TIÈDE</span>
            <span>5 jours</span>
          </div>
          <div className="tarif-name">Essentiel</div>
          <div className="tarif-temp">38<span className="deg">°</span></div>
          <div className="tarif-price">à partir de <b>490€</b> TTC</div>
          <span className="tarif-from">Site one-page · livré rapide</span>
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
          <div className="tarif-head">
            <span>T02 · CHAUD</span>
            <span className="badge">POPULAIRE</span>
          </div>
          <div className="tarif-name">Pro</div>
          <div className="tarif-temp">66<span className="deg">°</span></div>
          <div className="tarif-price">à partir de <b>990€</b> TTC</div>
          <span className="tarif-from">Site multi-pages · régime nominal</span>
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
          <div className="tarif-head">
            <span>T03 · BRÛLANT</span>
            <span>devis</span>
          </div>
          <div className="tarif-name">Sur-mesure</div>
          <div className="tarif-temp">99<span className="deg">°</span></div>
          <div className="tarif-price">devis <b>personnalisé</b></div>
          <span className="tarif-from">Logiciels · apps · projets complexes</span>
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
