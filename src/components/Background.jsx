import { useEffect, useRef } from 'react'
import { subscribeThermal, thermal } from '../hooks/useThermal'

// Fond instrument : grille fine + courbe thermique animée qui scroll avec la page.
// Léger (canvas 2D), pas de Three.js — la "vraie" identité visuelle est ailleurs.
// Le fond et les deux grilles sont peints une fois par taille d'écran dans une
// toile cachée ; chaque image ne redessine que la courbe et ses repères.
// 60 images/s à la souris, 30 sur écran tactile, vitesse de la vague identique.
export default function Background() {
  const ref = useRef(null)

  useEffect(() => {
    const canvas = ref.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    const grid = document.createElement('canvas')
    const gctx = grid.getContext('2d')
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const frameMs = window.matchMedia('(pointer: fine)').matches ? 1000 / 60 : 1000 / 30

    let W = 0, H = 0, dpr = 1
    let raf = 0
    let running = false
    let last = 0
    let t = 0

    const bg = getComputedStyle(document.documentElement).getPropertyValue('--bg').trim() || '#f5f3ee'

    // Couches fixes : couleur de page, grille principale (~80px) et grille fine
    const paintGrid = () => {
      grid.width = W * dpr
      grid.height = H * dpr
      gctx.setTransform(dpr, 0, 0, dpr, 0, 0)

      gctx.fillStyle = bg
      gctx.fillRect(0, 0, W, H)

      const cell = 80
      gctx.strokeStyle = 'rgba(22,22,26,0.045)'
      gctx.lineWidth = 1
      gctx.beginPath()
      for (let x = 0; x <= W; x += cell) {
        gctx.moveTo(x + 0.5, 0)
        gctx.lineTo(x + 0.5, H)
      }
      for (let y = 0; y <= H; y += cell) {
        gctx.moveTo(0, y + 0.5)
        gctx.lineTo(W, y + 0.5)
      }
      gctx.stroke()

      gctx.strokeStyle = 'rgba(22,22,26,0.02)'
      gctx.beginPath()
      const sub = cell / 4
      for (let x = 0; x <= W; x += sub) {
        gctx.moveTo(x + 0.5, 0)
        gctx.lineTo(x + 0.5, H)
      }
      for (let y = 0; y <= H; y += sub) {
        gctx.moveTo(0, y + 0.5)
        gctx.lineTo(W, y + 0.5)
      }
      gctx.stroke()
    }

    const draw = () => {
      ctx.setTransform(1, 0, 0, 1, 0, 0)
      ctx.drawImage(grid, 0, 0)
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)

      // Repères majeurs (lignes horizontales bleutées, plus marquées en bas du viewport)
      const accent = thermal.rgb
      ctx.strokeStyle = `rgba(${accent}, 0.07)`
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.moveTo(0, H * 0.5 + 0.5)
      ctx.lineTo(W, H * 0.5 + 0.5)
      ctx.stroke()

      // Courbe thermique : sinus modulé qui se "chauffe" avec le scroll
      const amp = 18 + thermal.t * 50
      const freq = 0.006
      const baseY = H * 0.5
      const points = 220

      // Glow externe
      ctx.strokeStyle = `rgba(${accent}, 0.4)`
      ctx.lineWidth = 1.2
      ctx.shadowColor = `rgba(${accent}, 0.45)`
      ctx.shadowBlur = 10
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
      ctx.strokeStyle = 'rgba(22,22,26,0.12)'
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

    const resize = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 2)
      W = window.innerWidth
      H = window.innerHeight
      canvas.width = W * dpr
      canvas.height = H * dpr
      canvas.style.width = W + 'px'
      canvas.style.height = H + 'px'
      paintGrid()
      draw()
    }

    // La vague avance selon le temps écoulé (0,012 par image à 60 images/s),
    // pas selon le nombre d'images : même vitesse à 30 qu'à 60.
    const loop = (now) => {
      raf = requestAnimationFrame(loop)
      const dt = now - last
      if (dt < frameMs - 4) return
      t += 0.012 * Math.min(dt, 100) / 16.667
      last = now
      draw()
    }

    const start = () => {
      if (running || reduce || document.hidden) return
      running = true
      last = performance.now()
      raf = requestAnimationFrame(loop)
    }
    const stop = () => {
      running = false
      cancelAnimationFrame(raf)
    }
    const onVisibility = () => {
      if (document.hidden) stop()
      else if (document.readyState === 'complete') start()
    }

    // Boucle à l'arrêt (mouvement réduit, page encore en chargement, onglet caché) :
    // l'image fixe est redessinée quand la température change, donc au scroll
    const unsubscribe = subscribeThermal(() => { if (!running) draw() })

    resize()
    window.addEventListener('resize', resize)
    document.addEventListener('visibilitychange', onVisibility)

    // La boucle attend la fin du chargement de la page
    if (document.readyState === 'complete') start()
    else window.addEventListener('load', start)

    return () => {
      stop()
      unsubscribe()
      window.removeEventListener('resize', resize)
      window.removeEventListener('load', start)
      document.removeEventListener('visibilitychange', onVisibility)
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
