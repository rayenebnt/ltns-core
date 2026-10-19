import { useEffect, useRef } from 'react'
import { subscribeThermal, thermal } from '../hooks/useThermal'

// Viseur qui suit la souris. Rien ne tourne sur téléphone ni sur écran tactile
// (le CSS le masque déjà) ; sur ordinateur, une image n'est demandée qu'au
// mouvement de la souris, et la température suit le magasin thermique.
const HIDDEN_QUERY = '(max-width: 900px), (pointer: coarse)'

export default function Cursor() {
  const wrapRef = useRef(null)
  const xRef = useRef(null)
  const yRef = useRef(null)
  const tRef = useRef(null)

  useEffect(() => {
    const wrap = wrapRef.current
    if (!wrap) return
    const mq = window.matchMedia(HIDDEN_QUERY)

    let mx = 0, my = 0
    let raf = 0
    let stop = null

    const paint = () => {
      raf = 0
      wrap.style.transform = `translate(${mx}px, ${my}px)`
      if (xRef.current) xRef.current.textContent = String(Math.round(mx)).padStart(4, '0')
      if (yRef.current) yRef.current.textContent = String(Math.round(my)).padStart(4, '0')
    }

    const onMove = (e) => {
      mx = e.clientX
      my = e.clientY
      if (!raf) raf = requestAnimationFrame(paint)
    }

    const showTemp = () => {
      if (tRef.current) tRef.current.textContent = thermal.temp + '°'
    }

    const start = () => {
      document.addEventListener('mousemove', onMove)
      showTemp()
      const unsubscribe = subscribeThermal(showTemp)
      return () => {
        document.removeEventListener('mousemove', onMove)
        unsubscribe()
        cancelAnimationFrame(raf)
        raf = 0
      }
    }

    // Fenêtre étroite agrandie ensuite (ou l'inverse) : on suit le changement,
    // sinon le viseur resterait figé dans le coin alors que le CSS l'affiche.
    const sync = () => {
      if (mq.matches && stop) { stop(); stop = null }
      else if (!mq.matches && !stop) stop = start()
    }

    sync()
    mq.addEventListener?.('change', sync)
    return () => {
      mq.removeEventListener?.('change', sync)
      if (stop) stop()
    }
  }, [])

  return (
    <div className="cursor-wrap" ref={wrapRef} aria-hidden="true" data-nosnippet="">
      <div className="cursor-cross"></div>
      <div className="cursor-readout">
        X<b ref={xRef}>0000</b> Y<b ref={yRef}>0000</b> T<b ref={tRef}>12.0°</b>
      </div>
    </div>
  )
}
