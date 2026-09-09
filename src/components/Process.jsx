import ParcoursTrigger from './ParcoursTrigger'

const steps = [
  { num: '01', temp: '38', title: 'On discute', desc: 'On parle de votre projet, de vos besoins et de votre budget. Vous recevez un devis détaillé sous 48h, sans engagement.' },
  { num: '02', temp: '60', title: 'Je dessine', desc: 'Je vous montre à quoi ressemblera votre projet. Rien n\'est créé tant que vous n\'avez pas dit oui.' },
  { num: '03', temp: '82', title: 'Je construis', desc: 'Je crée votre projet et je vérifie qu\'il fonctionne bien partout : ordinateur, tablette et téléphone.' },
  { num: '04', temp: '99', title: 'Vous recevez', desc: 'Votre projet est mis en ligne. Je vous remets tous les accès et je vous explique comment vous en servir.' }
]

// Petite courbe SVG qui monte en température : 38 → 99
function HeatCurve() {
  const points = steps.map((s, i) => ({
    x: 80 + (i * (1040 / (steps.length - 1))),
    y: 140 - (parseInt(s.temp) - 30) * 1.45,
  }))
  const path = points.map((p, i) => (i === 0 ? `M ${p.x},${p.y}` : `L ${p.x},${p.y}`)).join(' ')
  const area = `${path} L ${points[points.length - 1].x},160 L ${points[0].x},160 Z`
  return (
    <svg viewBox="0 0 1200 160" preserveAspectRatio="none">
      <defs>
        <linearGradient id="heatGrad" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#4dd0e1" />
          <stop offset="50%" stopColor="#facc15" />
          <stop offset="100%" stopColor="#ef4444" />
        </linearGradient>
        <linearGradient id="heatFill" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="rgba(255,255,255,0.08)" />
          <stop offset="100%" stopColor="rgba(255,255,255,0)" />
        </linearGradient>
      </defs>
      {/* Lignes horizontales repères */}
      {[20, 50, 80, 110, 140].map(y => (
        <line key={y} x1="0" x2="1200" y1={y} y2={y} stroke="rgba(255,255,255,0.05)" strokeWidth="1" />
      ))}
      <path d={area} fill="url(#heatFill)" />
      <path d={path} fill="none" stroke="url(#heatGrad)" strokeWidth="2" />
      {points.map((p, i) => (
        <g key={i}>
          <circle cx={p.x} cy={p.y} r="6" fill="#0a0a0c" stroke="url(#heatGrad)" strokeWidth="2" />
          <circle cx={p.x} cy={p.y} r="2" fill="#fff" />
        </g>
      ))}
    </svg>
  )
}

export default function Process() {
  return (
    <section id="process" className="process">
      <div className="section-head reveal">
        <div>
          <span className="section-label">
            <b>03</b><span className="sep">//</span> PROCESS
          </span>
          <h2 className="section-title">Quatre étapes,<br/><em>zéro mauvaise surprise</em>.</h2>
          <p className="section-intro">
            De la première idée au projet en ligne. Vous validez chaque étape :
            rien n'avance sans votre accord.
          </p>
        </div>
        <div className="section-temp">
          72<span className="deg">°</span>
          <span className="label">ÉTAPE PAR ÉTAPE</span>
        </div>
      </div>

      <div className="process-curve reveal">
        <HeatCurve />
        <div className="process-list">
          {steps.map(s => (
            <div className="process-step" key={s.num}>
              <div className="head">
                <span>ÉTAPE <b>{s.num}</b></span>
                <span>·</span>
              </div>
              <div className="temp">{s.temp}<span className="deg">°</span></div>
              <h4>{s.title}</h4>
              <p>{s.desc}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="process-parcours reveal">
        <p>
          Vous préférez voir plutôt que lire&nbsp;?
          <span> Chaque étape en volume, à votre rythme.</span>
        </p>
        <ParcoursTrigger variant="band" />
      </div>
    </section>
  )
}
