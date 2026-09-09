import { useEffect, useState } from 'react'
import { STEPS, useParcours } from './Parcours'

function Cube() {
  return (
    <span className="parcours-cube" aria-hidden="true">
      <i /><i /><i /><i /><i /><i />
    </span>
  )
}

// Quatre points d'entrée vers la scène 3D :
// hero  — grande carte animée en tête de page
// nav   — raccourci permanent dans la barre du haut
// band  — bandeau pleine largeur à la fin du process
// float — pastille flottante qui apparaît dès qu'on quitte le hero
export default function ParcoursTrigger({ variant = 'hero' }) {
  const { open, openParcours } = useParcours()
  const [visible, setVisible] = useState(variant !== 'float')
  const [bandVisible, setBandVisible] = useState(false)

  // La pastille flottante n'apparaît qu'une fois le hero passé…
  useEffect(() => {
    if (variant !== 'float') return
    const onScroll = () => setVisible(window.scrollY > window.innerHeight * 0.6)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [variant])

  // …et s'efface quand le bandeau du process est déjà sous les yeux.
  useEffect(() => {
    if (variant !== 'float') return
    const band = document.querySelector('.process-parcours')
    if (!band || typeof IntersectionObserver === 'undefined') return
    const io = new IntersectionObserver(([e]) => setBandVisible(e.isIntersecting))
    io.observe(band)
    return () => io.disconnect()
  }, [variant])

  if (variant === 'float' && (!visible || open || bandVisible)) return null

  const label = `Ouvrir le parcours client en 3D — ${STEPS.length} étapes`

  return (
    <button
      type="button"
      className={`parcours-trigger parcours-trigger--${variant}`}
      onClick={openParcours}
      aria-label={label}
      title={label}
    >
      <span className="parcours-trigger-inner">
        <Cube />

        {variant === 'nav' ? (
          <span className="parcours-trigger-label">
            parcours <span className="parcours-trigger-label-long">3D</span>
          </span>
        ) : (
          <>
            <span className="parcours-trigger-text">
              {variant === 'hero' && (
                <span className="parcours-badge">● INTERACTIF · 3D</span>
              )}
              <b>
                {variant === 'band'
                  ? 'Voir le parcours en 3D'
                  : 'Voir comment ça se passe'}
              </b>
              <span className="parcours-trigger-sub">
                {variant === 'band' && `Le parcours client de A à Z · ${STEPS.length} étapes · 1 min`}
                {variant === 'hero' && `De A à Z · ${STEPS.length} étapes · 1 min`}
                {variant === 'float' && `${STEPS.length} étapes · 1 min`}
              </span>
            </span>
            <span className="parcours-trigger-go">
              LANCER <i aria-hidden="true">▶</i>
            </span>
          </>
        )}
      </span>
    </button>
  )
}
