const items = [
  {
    num: '01',
    label: 'PRIX',
    title: 'Des prix justes',
    desc: 'Un travail de professionnel à un prix qui reste accessible. Le devis est gratuit et tout y est écrit : vous savez ce que vous payez avant de signer, sans frais surprise.',
    fill: 96,
    metric: 'CLARTÉ'
  },
  {
    num: '02',
    label: 'QUALITÉ',
    title: 'Du beau travail',
    desc: 'Un design moderne, un site rapide et agréable à utiliser. Le même résultat que dans une grande agence, avec une seule personne en face de vous.',
    fill: 98,
    metric: 'FINITION'
  },
  {
    num: '03',
    label: 'SUIVI',
    title: 'Un vrai suivi',
    desc: 'Vous me parlez directement, sans intermédiaire. Je vous conseille, je réponds à vos questions et je vous montre comment utiliser votre projet une fois livré.',
    fill: 92,
    metric: 'PROXIMITÉ'
  },
  {
    num: '04',
    label: 'DÉLAIS',
    title: 'Les délais tenus',
    desc: 'La date annoncée est la date de livraison. On fixe le calendrier ensemble au départ, et je m\'y tiens jusqu\'au bout.',
    fill: 94,
    metric: 'PONCTUALITÉ'
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
          <h2 className="section-title">Un freelance,<br/><em>quatre promesses</em>.</h2>
          <p className="section-intro">
            La qualité d'une grande agence, sans le prix d'une grande agence.
            Une seule personne s'occupe de votre projet, du premier échange à la mise en ligne.
          </p>
        </div>
        <div className="section-temp">
          24<span className="deg">°</span>
          <span className="label">DES BASES SOLIDES</span>
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
