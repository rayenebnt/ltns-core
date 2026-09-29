import { useEffect, useState } from 'react'

// Bouton de devis toujours à portée de main pendant la lecture de la page.
// Il se cache sur l'accueil, pendant le formulaire de devis et sur le pied de page.
export default function StickyCta() {
  const [pastHero, setPastHero] = useState(false)
  const [inTheWay, setInTheWay] = useState(false)

  useEffect(() => {
    const onScroll = () => setPastHero(window.scrollY > window.innerHeight * 0.8)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => {
    const targets = document.querySelectorAll('#contact .contact, footer')
    if (!targets.length || typeof IntersectionObserver === 'undefined') return
    const onScreen = new Set()
    const io = new IntersectionObserver(entries => {
      entries.forEach(e => (e.isIntersecting ? onScreen.add(e.target) : onScreen.delete(e.target)))
      setInTheWay(onScreen.size > 0)
    })
    targets.forEach(t => io.observe(t))
    return () => io.disconnect()
  }, [])

  const visible = pastHero && !inTheWay

  return (
    <a
      href="#contact"
      className={`sticky-cta${visible ? ' is-visible' : ''}`}
      aria-hidden={!visible}
      tabIndex={visible ? 0 : -1}
    >
      <span className="sticky-cta-txt">
        <b>Devis gratuit</b>
        <span>Réponse sous 48h · sans engagement</span>
      </span>
      <span className="sticky-cta-go">Demander <span className="arrow">→</span></span>
    </a>
  )
}
