const items = [
  {
    num: '01',
    icon: <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />,
    title: 'Prix justes',
    desc: 'Devis gratuit, tarifs transparents, pas de frais cachés. Vous savez exactement ce que vous payez avant de vous engager.'
  },
  {
    num: '02',
    icon: <path d="m12 3-1.9 5.8a2 2 0 0 1-1.3 1.3L3 12l5.8 1.9a2 2 0 0 1 1.3 1.3L12 21l1.9-5.8a2 2 0 0 1 1.3-1.3L21 12l-5.8-1.9a2 2 0 0 1-1.3-1.3Z" />,
    title: 'Qualité pro',
    desc: 'Code propre, design moderne, performances optimisées. Un site qui n\'a rien à envier à ceux des concurrents.'
  },
  {
    num: '03',
    icon: <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />,
    title: 'Accompagnement',
    desc: 'Échange direct avec moi, sans intermédiaire. Conseils, suivi, formation à la prise en main de votre site.'
  },
  {
    num: '04',
    icon: <><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></>,
    title: 'Délais respectés',
    desc: 'Une date annoncée, une date tenue. Chaque projet dispose d\'un planning clair, validé ensemble dès le départ.'
  }
]

export default function Pourquoi() {
  return (
    <section id="pourquoi">
      <div className="reveal">
        <span className="section-label">01 — pourquoi moi</span>
        <h2 className="section-title">Un freelance, <em>quatre engagements</em>.</h2>
        <p className="section-intro">
          Je conçois des sites, logiciels et applications qui rivalisent avec ceux des grandes agences,
          avec le suivi et la réactivité d'un interlocuteur unique.
        </p>
      </div>
      <div className="pourquoi-grid reveal">
        {items.map((item) => (
          <div className="pourquoi-item" key={item.num}>
            <span className="num">{item.num}</span>
            <svg className="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              {item.icon}
            </svg>
            <h3>{item.title}</h3>
            <p>{item.desc}</p>
          </div>
        ))}
      </div>
    </section>
  )
}
