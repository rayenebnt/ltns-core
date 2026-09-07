export default function Tarifs() {
  return (
    <section id="tarifs">
      <div className="section-head reveal">
        <div>
          <span className="section-label">
            <b>04</b><span className="sep">//</span> TARIFS
          </span>
          <h2 className="section-title">Trois formules,<br/><em>une promesse</em>.</h2>
          <p className="section-intro">
            Des prix annoncés à l'avance, sans mauvaise surprise. Et tout reste ajustable
            selon ce dont vous avez vraiment besoin.
          </p>
        </div>
        <div className="section-temp">
          84<span className="deg">°</span>
          <span className="label">DES PRIX CLAIRS</span>
        </div>
      </div>

      <div className="tarifs-grid reveal">

        <div className="tarif">
          <div className="tarif-head">
            <span>FORMULE 01 · TIÈDE</span>
            <span>5 jours</span>
          </div>
          <div className="tarif-name">Essentiel</div>
          <div className="tarif-temp">38<span className="deg">°</span></div>
          <div className="tarif-price">à partir de <b>490€</b> TTC</div>
          <span className="tarif-from">Un site d'une page · livré vite</span>
          <ul>
            <li>Un site d'une seule page</li>
            <li>Lisible sur ordinateur et téléphone</li>
            <li>Design créé pour vous</li>
            <li>Formulaire de contact</li>
            <li>1ʳᵉ année en ligne offerte</li>
            <li>Les bases pour être trouvé sur Google</li>
          </ul>
          <a href="#contact" className="btn btn-ghost">Choisir <span className="arrow">→</span></a>
        </div>

        <div className="tarif featured">
          <div className="tarif-head">
            <span>FORMULE 02 · CHAUD</span>
            <span className="badge">POPULAIRE</span>
          </div>
          <div className="tarif-name">Pro</div>
          <div className="tarif-temp">66<span className="deg">°</span></div>
          <div className="tarif-price">à partir de <b>990€</b> TTC</div>
          <span className="tarif-from">Un site complet · le plus demandé</span>
          <ul>
            <li>Jusqu'à 6 pages</li>
            <li>Design soigné, simple à utiliser</li>
            <li>Animations créées pour vous</li>
            <li>Un espace pour modifier vos textes</li>
            <li>Mieux placé sur Google + suivi des visites</li>
            <li>1ʳᵉ année en ligne offerte</li>
          </ul>
          <a href="#contact" className="btn btn-primary">Choisir <span className="arrow">→</span></a>
        </div>

        <div className="tarif">
          <div className="tarif-head">
            <span>FORMULE 03 · BRÛLANT</span>
            <span>devis</span>
          </div>
          <div className="tarif-name">Sur-mesure</div>
          <div className="tarif-temp">99<span className="deg">°</span></div>
          <div className="tarif-price">devis <b>personnalisé</b></div>
          <span className="tarif-from">Logiciels · applications · gros projets</span>
          <ul>
            <li>Boutique en ligne complète</li>
            <li>Des fonctions rien que pour vous</li>
            <li>Connexion avec vos autres outils</li>
            <li>Suivi et mises à jour dans la durée</li>
            <li>Un vrai travail sur votre visibilité Google</li>
          </ul>
          <a href="#contact" className="btn btn-ghost">Discutons-en <span className="arrow">→</span></a>
        </div>

      </div>
    </section>
  )
}
