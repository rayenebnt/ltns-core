import { useEffect, useState } from 'react'
import { STEPS, useParcours } from './Parcours'

function Cube() {
  return (
    <span className="parcours-cube" aria-hidden="true">
      <i /><i /><i /><i /><i /><i />
    </span>
  )
}

// Points d'entrée vers la visite guidée (le grand bloc de la section Process
// est dans Process.jsx) :
// hero  — grande carte animée en tête de page
// nav   — raccourci permanent dans la barre du haut
// float — pastille flottante qui apparaît dès qu'on quitte le hero
export default function ParcoursTrigger({ variant = 'hero' }) {
  const { open, openParcours } = useParcours()
  const [visible, setVisible] = useState(variant !== 'float')
  const [inTheWay, setInTheWay] = useState(false)

  // La pastille flottante n'apparaît qu'une fois le hero passé…
  useEffect(() => {
    if (variant !== 'float') return
    const onScroll = () => setVisible(window.scrollY > window.innerHeight * 0.6)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [variant])

  // …et s'efface quand le grand bloc du process est déjà sous les yeux, ou quand
  // le film ou le formulaire de devis sont à l'écran (pour ne pas en masquer les boutons).
  useEffect(() => {
    if (variant !== 'float') return
    const targets = document.querySelectorAll('.visite, form.devis, .film')
    if (!targets.length || typeof IntersectionObserver === 'undefined') return
    const onScreen = new Set()
    const io = new IntersectionObserver(entries => {
      entries.forEach(e => (e.isIntersecting ? onScreen.add(e.target) : onScreen.delete(e.target)))
      setInTheWay(onScreen.size > 0)
    })
    targets.forEach(t => io.observe(t))
    return () => io.disconnect()
  }, [variant])

  if (variant === 'float' && (!visible || open || inTheWay)) return null

  const label = `Lancer la visite guidée — votre projet de A à Z en ${STEPS.length} étapes`

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
            visite <span className="parcours-trigger-label-long">guidée</span>
          </span>
        ) : (
          <>
            <span className="parcours-trigger-text">
              {variant === 'hero' && (
                <span className="parcours-badge">● VISITE GUIDÉE · INTERACTIVE</span>
              )}
              <b>Voir comment ça se passe</b>
              <span className="parcours-trigger-sub">
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
