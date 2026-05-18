const items = [
  {
    num: '01',
    label: 'CALIBRAGE',
    title: 'Prix justes',
    desc: 'Des livrables pro à des tarifs pensés pour les petits budgets. Devis gratuit, zéro frais caché — vous savez ce que vous payez avant de signer.',
    fill: 96,
    metric: 'CLARTÉ'
  },
  {
    num: '02',
    label: 'TENUE',
    title: 'Qualité pro',
    desc: 'Code propre, design moderne, performances optimisées. Un rendu au niveau des meilleures agences, livré par un seul interlocuteur.',
    fill: 98,
    metric: 'STANDARD'
  },
  {
    num: '03',
    label: 'CONTACT',
    title: 'Accompagnement',
    desc: 'Échange direct, sans intermédiaire. Conseils, suivi, formation à la prise en main de votre projet une fois livré.',
    fill: 92,
    metric: 'PROXIMITÉ'
  },
  {
    num: '04',
    label: 'DÉLAI',
    title: 'Précision',
    desc: 'Une date annoncée, une date tenue. Planning clair, validé ensemble dès le départ, respecté jusqu\'au bout.',
    fill: 94,
    metric: 'PRÉCISION'
  }
]

export default function Pourquoi() {
  return (
    <section id="pourquoi">
      <div className="section-head reveal">
        <div>
          <span className="section-label">
            <b>01</b><span className="sep">//</span> POURQUOI MOI
          </span>
          <h2 className="section-title">Un freelance,<br/><em>quatre engagements</em>.</h2>
          <p className="section-intro">
            La qualité des grandes agences, sans leurs tarifs. Un seul interlocuteur,
            des livrables propres, des prix accessibles — sans compromis sur le résultat.
          </p>
        </div>
        <div className="section-temp">
          24<span className="deg">°</span>
          <span className="label">RÉGIME · STABLE</span>
        </div>
      </div>

      <div className="pourquoi-grid reveal">
        {items.map((item) => (
          <div className="pourquoi-item" key={item.num}>
            <div className="head">
              <span><b>#{item.num}</b> · {item.label}</span>
              <span>{item.fill}%</span>
            </div>
            <h3>{item.title}</h3>
            <p>{item.desc}</p>
            <div className="gauge-h" style={{ '--fill': item.fill + '%' }}></div>
            <div className="gauge-h-label">
              <span>{item.metric}</span>
              <b>+{item.fill}.0°</b>
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}
