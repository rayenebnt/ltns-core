import { useEffect } from 'react'

// Pilote la "température" du site en fonction du scroll.
// Expose --t (0→1), --temp (degrés affichés), --accent (couleur cold→hot)
// sur :root, écoutables par tout le CSS et par les composants via une lecture
// instantanée du DOM.
//
// Échelle :   0%  scroll → 12.0° (froid, cyan)
//           100% scroll → 99.0° (chaud, rouge)
// Teintes profondes : lisibles en texte comme en aplat sur le fond clair du site.
const COLD_TEMP = 12
const HOT_TEMP = 99

// 6 stops : cyan → bleu → violet → ambre → orange → rouge
// (le violet évite le gris-brun terne entre le bleu et l'ambre)
const STOPS = [
  { t: 0.00, r:   8, g: 145, b: 178 }, // #0891b2 cyan
  { t: 0.22, r:  37, g:  99, b: 235 }, // #2563eb bleu
  { t: 0.42, r: 124, g:  58, b: 237 }, // #7c3aed violet
  { t: 0.62, r: 217, g: 119, b:   6 }, // #d97706 ambre
  { t: 0.80, r: 234, g:  88, b:  12 }, // #ea580c orange
  { t: 1.00, r: 220, g:  38, b:  38 }, // #dc2626 rouge
]

function lerp(a, b, t) { return a + (b - a) * t }

export function tempColor(t) {
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

// Couleur du texte posé sur un aplat de couleur : noir ou blanc,
// celui qui contraste le mieux (luminance relative WCAG).
export function inkOn({ r, g, b }) {
  const lin = v => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4 }
  const L = 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b)
  return L > 0.19 ? '#111114' : '#ffffff'
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
      root.style.setProperty('--accent-glow', `rgba(${hot}, 0.3)`)
      root.style.setProperty('--on-accent', inkOn(c))
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
