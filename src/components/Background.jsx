import { useEffect, useRef } from 'react'

// Fond instrument : grille fine + courbe thermique animée qui scroll avec la page.
// Léger (canvas 2D), pas de Three.js — la "vraie" identité visuelle est ailleurs.
export default function Background() {
  const ref = useRef(null)

  useEffect(() => {
    const canvas = ref.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')

    let W = 0, H = 0, dpr = 1
    let raf = 0
    let progress = 0
    let t = 0

    const resize = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 2)
      W = window.innerWidth
      H = window.innerHeight
      canvas.width = W * dpr
      canvas.height = H * dpr
      canvas.style.width = W + 'px'
      canvas.style.height = H + 'px'
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    }

    const onScroll = () => {
      const max = document.documentElement.scrollHeight - window.innerHeight
      progress = max > 0 ? window.scrollY / max : 0
    }

    const readAccent = () => {
      const rgb = getComputedStyle(document.documentElement)
        .getPropertyValue('--accent-rgb').trim() || '77, 208, 225'
      return rgb
    }

    const draw = () => {
      raf = requestAnimationFrame(draw)
      t += 0.012

      ctx.clearRect(0, 0, W, H)

      // Fond
      ctx.fillStyle = '#0a0a0c'
      ctx.fillRect(0, 0, W, H)

      // Grille principale (carrés ~80px)
      const cell = 80
      ctx.strokeStyle = 'rgba(255,255,255,0.025)'
      ctx.lineWidth = 1
      ctx.beginPath()
      for (let x = 0; x <= W; x += cell) {
        ctx.moveTo(x + 0.5, 0)
        ctx.lineTo(x + 0.5, H)
      }
      for (let y = 0; y <= H; y += cell) {
        ctx.moveTo(0, y + 0.5)
        ctx.lineTo(W, y + 0.5)
      }
      ctx.stroke()

      // Grille fine (subdivisions)
      ctx.strokeStyle = 'rgba(255,255,255,0.012)'
      ctx.beginPath()
      const sub = cell / 4
      for (let x = 0; x <= W; x += sub) {
        ctx.moveTo(x + 0.5, 0)
        ctx.lineTo(x + 0.5, H)
      }
      for (let y = 0; y <= H; y += sub) {
        ctx.moveTo(0, y + 0.5)
        ctx.lineTo(W, y + 0.5)
      }
      ctx.stroke()

      // Repères majeurs (lignes horizontales bleutées, plus marquées en bas du viewport)
      const accent = readAccent()
      ctx.strokeStyle = `rgba(${accent}, 0.07)`
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.moveTo(0, H * 0.5 + 0.5)
      ctx.lineTo(W, H * 0.5 + 0.5)
      ctx.stroke()

      // Courbe thermique : sinus modulé qui se "chauffe" avec le scroll
      const amp = 18 + progress * 50
      const freq = 0.006
      const baseY = H * 0.5
      const points = 220

      // Glow externe
      ctx.strokeStyle = `rgba(${accent}, 0.35)`
      ctx.lineWidth = 1.2
      ctx.shadowColor = `rgba(${accent}, 0.8)`
      ctx.shadowBlur = 14
      ctx.beginPath()
      for (let i = 0; i <= points; i++) {
        const x = (i / points) * W
        const y = baseY +
          Math.sin(x * freq + t) * amp * 0.6 +
          Math.sin(x * freq * 2.3 - t * 0.7) * amp * 0.25 +
          Math.cos(x * freq * 0.4 + t * 0.4) * amp * 0.3
        if (i === 0) ctx.moveTo(x, y)
        else ctx.lineTo(x, y)
      }
      ctx.stroke()
      ctx.shadowBlur = 0

      // Pointillé central (axe)
      ctx.strokeStyle = `rgba(${accent}, 0.12)`
      ctx.setLineDash([2, 8])
      ctx.beginPath()
      ctx.moveTo(0, baseY + 0.5)
      ctx.lineTo(W, baseY + 0.5)
      ctx.stroke()
      ctx.setLineDash([])

      // Marqueurs verticaux gauche/droite (style instrument)
      ctx.strokeStyle = 'rgba(255,255,255,0.06)'
      ctx.fillStyle = 'rgba(255,255,255,0.18)'
      ctx.font = '9px JetBrains Mono, monospace'
      const margin = 18
      const ticks = 8
      for (let i = 0; i <= ticks; i++) {
        const y = (i / ticks) * H
        ctx.beginPath()
        ctx.moveTo(margin, y + 0.5)
        ctx.lineTo(margin + 6, y + 0.5)
        ctx.stroke()
      }
    }

    resize()
    onScroll()
    draw()
    window.addEventListener('resize', resize)
    window.addEventListener('scroll', onScroll, { passive: true })

    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', resize)
      window.removeEventListener('scroll', onScroll)
    }
  }, [])

  return (
    <canvas
      ref={ref}
      aria-hidden="true"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 0,
        pointerEvents: 'none',
        display: 'block',
      }}
    />
  )
}
