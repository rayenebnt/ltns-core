import { useEffect, useRef, useState } from 'react'
import { getThermal } from '../hooks/useThermal'

// Éléments qui doivent faire réagir le curseur (affordance : « c'est cliquable »)
const INTERACTIVE = 'a, button, [role="button"], summary, .service, .tarif, .faq-q'
// Champs où le curseur natif est plus utile que le nôtre (I-beam, liste déroulante)
const NATIVE = 'input, textarea, select, [contenteditable="true"]'

export default function Cursor() {
  const wrapRef = useRef(null)
  const xRef = useRef(null)
  const yRef = useRef(null)
  const tRef = useRef(null)
  const [enabled, setEnabled] = useState(false)

  // Le curseur custom n'a de sens qu'avec une souris, et seulement si
  // l'utilisateur n'a pas demandé à réduire les animations.
  useEffect(() => {
    const mq = window.matchMedia('(pointer: fine) and (prefers-reduced-motion: no-preference)')
    const sync = () => setEnabled(mq.matches)
    sync()
    mq.addEventListener('change', sync)
    return () => mq.removeEventListener('change', sync)
  }, [])

  useEffect(() => {
    if (!enabled) return
    const wrap = wrapRef.current
    if (!wrap) return

    document.body.classList.add('has-custom-cursor')

    let mx = 0, my = 0
    let px = -1, py = -1
    let lastTemp = ''
    let raf

    const onMove = (e) => {
      mx = e.clientX
      my = e.clientY
      if (!wrap.classList.contains('ready')) wrap.classList.add('ready')
    }

    // Affordance : le curseur grossit sur un élément actionnable,
    // et s'efface sur un champ de saisie pour laisser passer le curseur natif.
    const onOver = (e) => {
      const t = e.target
      if (!(t instanceof Element)) return
      wrap.classList.toggle('native', !!t.closest(NATIVE))
      wrap.classList.toggle('hover', !t.closest(NATIVE) && !!t.closest(INTERACTIVE))
    }

    const onLeave = () => wrap.classList.remove('ready')

    const animate = () => {
      raf = requestAnimationFrame(animate)
      if (mx === px && my === py) return
      px = mx; py = my

      wrap.style.transform = `translate(${mx}px, ${my}px)`
      if (xRef.current) xRef.current.textContent = String(Math.round(mx)).padStart(4, '0')
      if (yRef.current) yRef.current.textContent = String(Math.round(my)).padStart(4, '0')
      const temp = getThermal().temp
      if (tRef.current && temp !== lastTemp) {
        lastTemp = temp
        tRef.current.textContent = temp + '°'
      }
    }

    document.addEventListener('mousemove', onMove)
    document.addEventListener('mouseover', onOver)
    document.addEventListener('mouseleave', onLeave)
    animate()

    return () => {
      document.body.classList.remove('has-custom-cursor')
      document.removeEventListener('mousemove', onMove)
      document.removeEventListener('mouseover', onOver)
      document.removeEventListener('mouseleave', onLeave)
      cancelAnimationFrame(raf)
    }
  }, [enabled])

  if (!enabled) return null

  return (
    <div className="cursor-wrap" ref={wrapRef} aria-hidden="true">
      <div className="cursor-ring"></div>
      <div className="cursor-cross"></div>
      <div className="cursor-readout">
        X<b ref={xRef}>0000</b> Y<b ref={yRef}>0000</b> T<b ref={tRef}>12.0°</b>
      </div>
    </div>
  )
}
