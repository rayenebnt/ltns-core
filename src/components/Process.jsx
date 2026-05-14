const steps = [
  { num: '01', title: 'Échange', desc: 'On discute de votre projet, vos besoins, votre budget. Devis détaillé sous 48h.' },
  { num: '02', title: 'Maquette', desc: 'Je conçois une maquette sur-mesure que vous validez avant tout développement.' },
  { num: '03', title: 'Développement', desc: 'Code propre, optimisé, responsive. Tests sur tous les supports avant livraison.' },
  { num: '04', title: 'Livraison', desc: 'Déploiement, mise en production, transfert complet. Et formation pour prendre en main votre projet.' }
]

export default function Process() {
  return (
    <section id="process" className="process">
      <div className="reveal">
        <span className="section-label">03 — process</span>
        <h2 className="section-title">Quatre étapes, <em>zéro mauvaise surprise</em>.</h2>
        <p className="section-intro">
          Une méthode claire pour passer de l'idée au projet livré, en gardant le contrôle à chaque étape.
        </p>
      </div>
      <div className="process-list reveal">
        {steps.map(s => (
          <div className="process-step" key={s.num}>
            <div className="step-num">{s.num}</div>
            <h4>{s.title}</h4>
            <p>{s.desc}</p>
          </div>
        ))}
      </div>
    </section>
  )
}
