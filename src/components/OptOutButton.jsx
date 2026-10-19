import { useEffect, useState } from 'react'

// Désactive (ou réactive) la mesure d'audience sur cet appareil.
// - Umami ne compte plus rien quand localStorage « umami.disabled » vaut 1 ;
// - Vercel Web Analytics lit « ltns-optout » (beforeSend, dans App.jsx).
// L'état n'est lu qu'après l'affichage : le HTML pré-rendu propose toujours
// « Désactiver… », et le bouton se met à jour dans le navigateur.
const KEYS = ['umami.disabled', 'ltns-optout']

export default function OptOutButton() {
  const [off, setOff] = useState(false)

  useEffect(() => {
    try {
      setOff(KEYS.some(k => localStorage.getItem(k) === '1'))
    } catch {
      // Stockage bloqué (navigation privée stricte) : rien à relire
    }
  }, [])

  const toggle = () => {
    const next = !off
    try {
      KEYS.forEach(k => (next ? localStorage.setItem(k, '1') : localStorage.removeItem(k)))
      setOff(next)
    } catch {
      // Stockage bloqué : le choix ne peut pas être retenu
    }
  }

  return (
    <>
      <button type="button" className="btn btn-ghost" onClick={toggle}>
        {off ? "Réactiver la mesure d'audience" : "Désactiver la mesure d'audience sur cet appareil"}
      </button>
      <span className="optout-status" role="status">
        {off ? "La mesure d'audience est désactivée sur cet appareil." : ''}
      </span>
    </>
  )
}
