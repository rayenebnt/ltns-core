import { useEffect } from 'react'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

gsap.registerPlugin(ScrollTrigger)

export default function useReveal(active) {
  useEffect(() => {
    if (!active) return

    const els = Array.from(document.querySelectorAll('.reveal'))

    // Mouvement réduit : le contenu s'affiche, point. Pas d'attente d'un
    // déclencheur au scroll pour lire la page.
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      els.forEach((el) => el.classList.add('visible'))
      return
    }

    const triggers = els.map((el) =>
      ScrollTrigger.create({
        trigger: el,
        start: 'top 85%',
        onEnter: () => el.classList.add('visible'),
        once: true,
      })
    )

    // Les webfonts changent la hauteur du document après coup : sans ce
    // recalcul, des sections peuvent rester invisibles sous le pli.
    const refresh = () => ScrollTrigger.refresh()
    if (document.fonts?.ready) document.fonts.ready.then(refresh)
    window.addEventListener('load', refresh)

    // Filet de sécurité : rien ne doit rester masqué si un déclencheur rate.
    const safety = setTimeout(() => els.forEach((el) => el.classList.add('visible')), 6000)

    return () => {
      clearTimeout(safety)
      window.removeEventListener('load', refresh)
      triggers.forEach((t) => t.kill())
    }
  }, [active])
}
