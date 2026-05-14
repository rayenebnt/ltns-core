import { useEffect, useRef } from 'react'

export default function Cursor() {
  const cursorRef = useRef(null)
  const dotRef = useRef(null)

  useEffect(() => {
    const cursor = cursorRef.current
    const dot = dotRef.current
    let mouseX = 0, mouseY = 0, cx = 0, cy = 0
    let raf

    const onMouseMove = (e) => {
      mouseX = e.clientX
      mouseY = e.clientY
      if (dot) {
        dot.style.left = mouseX + 'px'
        dot.style.top = mouseY + 'px'
      }
    }

    const animate = () => {
      cx += (mouseX - cx) * 0.18
      cy += (mouseY - cy) * 0.18
      if (cursor) {
        cursor.style.left = cx + 'px'
        cursor.style.top = cy + 'px'
      }
      raf = requestAnimationFrame(animate)
    }

    document.addEventListener('mousemove', onMouseMove)
    animate()

    // Hover effect
    const addHover = () => cursor?.classList.add('hover')
    const removeHover = () => cursor?.classList.remove('hover')

    const setupHovers = () => {
      const els = document.querySelectorAll('a, button, .service, .faq-q, input, textarea, select')
      els.forEach(el => {
        el.addEventListener('mouseenter', addHover)
        el.addEventListener('mouseleave', removeHover)
      })
      return els
    }

    // Petit délai pour laisser le DOM se construire
    let els
    const t = setTimeout(() => { els = setupHovers() }, 300)

    return () => {
      document.removeEventListener('mousemove', onMouseMove)
      cancelAnimationFrame(raf)
      clearTimeout(t)
      els?.forEach(el => {
        el.removeEventListener('mouseenter', addHover)
        el.removeEventListener('mouseleave', removeHover)
      })
    }
  }, [])

  return (
    <>
      <div className="cursor" ref={cursorRef} aria-hidden="true"></div>
      <div className="cursor-dot" ref={dotRef} aria-hidden="true"></div>
    </>
  )
}
