import { useEffect, useRef } from 'react'

export default function Cursor() {
  const wrapRef = useRef(null)
  const xRef = useRef(null)
  const yRef = useRef(null)
  const tRef = useRef(null)

  useEffect(() => {
    const wrap = wrapRef.current
    if (!wrap) return

    let mx = 0, my = 0
    let raf

    const onMove = (e) => {
      mx = e.clientX
      my = e.clientY
    }

    const animate = () => {
      wrap.style.transform = `translate(${mx}px, ${my}px)`
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

    return () => {
      document.removeEventListener('mousemove', onMove)
      cancelAnimationFrame(raf)
    }
  }, [])

  return (
    <div className="cursor-wrap" ref={wrapRef} aria-hidden="true">
      <div className="cursor-cross"></div>
      <div className="cursor-readout">
        X<b ref={xRef}>0000</b> Y<b ref={yRef}>0000</b> T<b ref={tRef}>12.0°</b>
      </div>
    </div>
  )
}
