import { useEffect } from 'react'

// Pilote la "température" du site en fonction du scroll.
// Expose --t (0→1), --temp (degrés affichés), --accent (couleur cold→hot)
// sur :root, écoutables par tout le CSS et par les composants via une lecture
// instantanée du DOM.
//
// Échelle :   0%  scroll → 12.0° (froid, cyan)
//           100% scroll → 99.0° (chaud, rouge)
const COLD_TEMP = 12
const HOT_TEMP = 99

// 5 stops : cyan → bleu → ambre → orange → rouge
const STOPS = [
  { t: 0.00, r:  77, g: 208, b: 225 }, // #4dd0e1 cyan
  { t: 0.25, r:  96, g: 165, b: 250 }, // #60a5fa bleu
  { t: 0.55, r: 250, g: 204, b:  21 }, // #facc15 jaune chaud
  { t: 0.80, r: 251, g: 146, b:  60 }, // #fb923c orange
  { t: 1.00, r: 239, g:  68, b:  68 }, // #ef4444 rouge
]

function lerp(a, b, t) { return a + (b - a) * t }

function tempColor(t) {
  for (let i = 0; i < STOPS.length - 1; i++) {
    const a = STOPS[i], b = STOPS[i + 1]
    if (t >= a.t && t <= b.t) {
      const k = (t - a.t) / (b.t - a.t)
      return {
        r: Math.round(lerp(a.r, b.r, k)),
        g: Math.round(lerp(a.g, b.g, k)),
        b: Math.round(lerp(a.b, b.b, k)),
      }
    }
  }
  const last = STOPS[STOPS.length - 1]
  return { r: last.r, g: last.g, b: last.b }
}

export default function useThermal() {
  useEffect(() => {
    const root = document.documentElement

    const update = () => {
      const max = document.documentElement.scrollHeight - window.innerHeight
      const t = max > 0 ? Math.min(1, Math.max(0, window.scrollY / max)) : 0
      const temp = COLD_TEMP + t * (HOT_TEMP - COLD_TEMP)
      const c = tempColor(t)
      const hot = `${c.r}, ${c.g}, ${c.b}`

      root.style.setProperty('--t', t.toFixed(4))
      root.style.setProperty('--temp', temp.toFixed(1))
      root.style.setProperty('--accent', `rgb(${hot})`)
      root.style.setProperty('--accent-rgb', hot)
      root.style.setProperty('--accent-soft', `rgba(${hot}, 0.12)`)
      root.style.setProperty('--accent-glow', `rgba(${hot}, 0.45)`)
      root.style.setProperty('--accent-line', `rgba(${hot}, 0.35)`)
    }

    update()
    window.addEventListener('scroll', update, { passive: true })
    window.addEventListener('resize', update)
    return () => {
      window.removeEventListener('scroll', update)
      window.removeEventListener('resize', update)
    }
  }, [])
}

// Helper : converti une position relative dans la page (0→1) en température
export function tempFor(progress) {
  return COLD_TEMP + progress * (HOT_TEMP - COLD_TEMP)
}
