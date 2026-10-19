import { useEffect } from 'react'

// Les blocs .reveal apparaissent quand leur haut passe à 85 % de l'écran, une
// seule fois. Ceux déjà dépassés (ex. arrivée sur /#faq) s'affichent aussitôt.
export default function useReveal(active) {
  useEffect(() => {
    if (!active) return

    const io = new IntersectionObserver(entries => {
      entries.forEach(e => {
        if (!e.isIntersecting && e.boundingClientRect.top >= 0) return
        e.target.classList.add('visible')
        io.unobserve(e.target)
      })
    }, { rootMargin: '0px 0px -15% 0px' })

    document.querySelectorAll('.reveal').forEach(el => io.observe(el))
    return () => io.disconnect()
  }, [active])
}
