import { STEPS, useParcours } from './Parcours'

// Le process se découvre en vidéo interactive : un seul grand bouton
// qui lance la visite guidée, avec un aperçu des étapes qui s'allument tour à tour.
export default function Process() {
  const { openParcours } = useParcours()

  return (
    <section id="process" className="process">
      <div className="section-head reveal">
        <div>
          <span className="section-label">
            <b>05</b><span className="sep">//</span> PROCESS
          </span>
          <h2 className="section-title">Votre projet,<br/><em>étape par étape</em>.</h2>
          <p className="section-intro">
            Pas de long discours : lancez la visite guidée et découvrez en une minute
            comment se passe votre projet, du premier message à la mise en ligne.
          </p>
        </div>
        <div className="section-temp">
          72<span className="deg">°</span>
          <span className="label">ÉTAPE PAR ÉTAPE</span>
        </div>
      </div>

      <button
        type="button"
        className="visite reveal"
        onClick={openParcours}
        aria-label={`Lancer la visite guidée : votre projet de A à Z en ${STEPS.length} étapes`}
      >
        <span className="visite-bg" aria-hidden="true" />

        <span className="visite-copy">
          <span className="visite-badge">● VISITE GUIDÉE · INTERACTIVE</span>
          <span className="visite-title">Votre projet<br/>de <em>A</em> à <em>Z</em></span>
          <span className="visite-sub">{STEPS.length} étapes · 1 minute · à votre rythme</span>
          <span className="visite-go">
            <span className="visite-play" aria-hidden="true"><i>▶</i></span>
            LANCER LA VISITE
          </span>
        </span>

        <span className="visite-stage" aria-hidden="true">
          <span className="visite-cube"><i /><i /><i /><i /><i /><i /></span>
          <span className="visite-steps">
            {STEPS.map((s, i) => (
              <span key={s.num} className="visite-step" style={{ '--c': s.color, '--k': i }}>
                <b>{s.num}</b>
                <span>{s.title}</span>
                <em>{s.temp}°</em>
              </span>
            ))}
          </span>
        </span>
      </button>
    </section>
  )
}
