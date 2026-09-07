import { useEffect, useState } from 'react'

// Page longue, une seule colonne : sans ça, revenir en haut demande
// de scroller tout le chemin inverse.
export default function BackToTop() {
  const [show, setShow] = useState(false)

  useEffect(() => {
    const onScroll = () => setShow(window.scrollY > window.innerHeight)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const toTop = () => {
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    window.scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' })
    document.getElementById('top')?.focus?.()
  }

  return (
    <button
      type="button"
      className={`back-to-top ${show ? 'show' : ''}`}
      onClick={toTop}
      tabIndex={show ? 0 : -1}
      aria-hidden={!show}
      aria-label="Revenir en haut de la page"
    >
      <span className="arrow" aria-hidden="true">↑</span>
      <span className="label">HAUT</span>
    </button>
  )
}
