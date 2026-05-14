import { useEffect, useRef } from 'react'

export default function Cursor() {
  const wrapRef = useRef(null)
  const ringRef = useRef(null)
  const xRef = useRef(null)
  const yRef = useRef(null)
  const tRef = useRef(null)

  useEffect(() => {
    const wrap = wrapRef.current
    const ring = ringRef.current
    if (!wrap || !ring) return

    let mx = 0, my = 0, cx = 0, cy = 0
    let raf

    const onMove = (e) => {
      mx = e.clientX
      my = e.clientY
    }

    const animate = () => {
      cx += (mx - cx) * 0.22
      cy += (my - cy) * 0.22
      wrap.style.transform = `translate(${mx}px, ${my}px)`
      ring.style.transform = `translate(${cx - mx}px, ${cy - my}px)`
      if (xRef.current) xRef.current.textContent = String(Math.round(mx)).padStart(4, '0')
      if (yRef.current) yRef.current.textContent = String(Math.round(my)).padStart(4, '0')
      if (tRef.current) {
        const temp = getComputedStyle(document.documentElement).getPropertyValue('--temp').trim() || '12.0'
        tRef.current.textContent = temp + '°'
      }
      raf = requestAnimationFrame(animate)
    }

    document.addEventListener('mousemove', onMove)
    animate()

    const addHover = () => ring.classList.add('hover')
    const removeHover = () => ring.classList.remove('hover')

    let els
    const t = setTimeout(() => {
      els = document.querySelectorAll('a, button, .service, .faq-q, input, textarea, select, .pourquoi-item, .tarif')
      els.forEach(el => {
        el.addEventListener('mouseenter', addHover)
        el.addEventListener('mouseleave', removeHover)
      })
    }, 300)

    return () => {
      document.removeEventListener('mousemove', onMove)
      cancelAnimationFrame(raf)
      clearTimeout(t)
      els?.forEach(el => {
        el.removeEventListener('mouseenter', addHover)
        el.removeEventListener('mouseleave', removeHover)
      })
    }
  }, [])

  return (
    <div className="cursor-wrap" ref={wrapRef} aria-hidden="true">
      <div className="cursor-cross"></div>
      <div className="cursor-ring" ref={ringRef}></div>
      <div className="cursor-readout">
        X<b ref={xRef}>0000</b> Y<b ref={yRef}>0000</b> T<b ref={tRef}>12.0°</b>
      </div>
    </div>
  )
}
