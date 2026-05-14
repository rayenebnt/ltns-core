import { useEffect, useRef } from 'react'
import * as THREE from 'three'

export default function Background() {
  const ref = useRef(null)

  useEffect(() => {
    const canvas = ref.current
    if (!canvas) return

    const mobile = window.innerWidth < 768
    let W = window.innerWidth
    let H = window.innerHeight

    // ── Scene ──
    const scene = new THREE.Scene()
    scene.fog = new THREE.FogExp2(0x0a0a0f, mobile ? 0.022 : 0.015)

    const cam = new THREE.PerspectiveCamera(65, W / H, 0.1, 300)
    cam.position.set(0, 3.5, 20)

    const renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: false,
      alpha: false,
      powerPreference: 'low-power',
    })
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, mobile ? 1 : 1.5))
    renderer.setSize(W, H)
    renderer.setClearColor(0x0a0a0f, 1)

    const disposables = []

    // ── Grid ──
    const COLS = mobile ? 10 : 22
    const ROWS = mobile ? 20 : 50
    const GW = 80
    const GD = 180

    const majorPos = []
    const minorPos = []

    for (let i = 0; i <= COLS; i++) {
      const x = -GW / 2 + (i / COLS) * GW
      const bucket = i % 4 === 0 ? majorPos : minorPos
      bucket.push(x, 0, 2, x, 0, -GD)
    }
    for (let j = 0; j <= ROWS; j++) {
      const z = -(j / ROWS) * GD
      const bucket = j % 5 === 0 ? majorPos : minorPos
      bucket.push(-GW / 2, 0, z, GW / 2, 0, z)
    }

    const makeSeg = (flat, opacity) => {
      const geo = new THREE.BufferGeometry()
      geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(flat), 3))
      const mat = new THREE.LineBasicMaterial({
        color: 0xa855f7,
        transparent: true,
        opacity,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      })
      disposables.push(geo, mat)
      return new THREE.LineSegments(geo, mat)
    }

    const grid = new THREE.Group()
    grid.position.y = -3
    grid.add(makeSeg(majorPos, 0.28))
    grid.add(makeSeg(minorPos, 0.09))
    scene.add(grid)

    // ── Particles ──
    const PCNT = mobile ? 300 : 900
    const pPos = new Float32Array(PCNT * 3)
    for (let i = 0; i < PCNT; i++) {
      pPos[i * 3]     = (Math.random() - 0.5) * 70
      pPos[i * 3 + 1] = (Math.random() - 0.5) * 20 + 2
      pPos[i * 3 + 2] = -Math.random() * GD
    }
    const pGeo = new THREE.BufferGeometry()
    pGeo.setAttribute('position', new THREE.BufferAttribute(pPos, 3))
    const pMat = new THREE.PointsMaterial({
      color: 0xb070f7,
      size: mobile ? 0.05 : 0.09,
      transparent: true,
      opacity: 0.55,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    })
    scene.add(new THREE.Points(pGeo, pMat))
    disposables.push(pGeo, pMat)

    // ── Fog color stops per scroll progress ──
    const fogStart = new THREE.Color(0x0a0a0f)
    const fogMid   = new THREE.Color(0x090a12)
    const fogEnd   = new THREE.Color(0x0a080e)
    const fogColor = new THREE.Color()

    // ── Scroll ──
    let progress = 0
    const onScroll = () => {
      const max = document.documentElement.scrollHeight - window.innerHeight
      progress = max > 0 ? window.scrollY / max : 0
    }
    window.addEventListener('scroll', onScroll, { passive: true })

    // ── Animate ──
    let raf
    let t = 0
    let camZ = 20
    const Z0 = 20
    const Z1 = -120

    const tick = () => {
      raf = requestAnimationFrame(tick)
      t += 0.004

      // Scroll-driven camera flythrough
      camZ += (Z0 + progress * (Z1 - Z0) - camZ) * 0.04
      cam.position.z = camZ

      // Subtle organic sway
      cam.position.x = Math.sin(t * 0.22) * 0.9
      cam.position.y = 3.5 + Math.sin(t * 0.17) * 0.5

      cam.lookAt(cam.position.x * 0.2, -0.8, camZ - 28)

      // Grid gentle drift
      grid.rotation.y = Math.sin(t * 0.11) * 0.04

      // Fog color shift with scroll
      if (progress < 0.5) {
        fogColor.lerpColors(fogStart, fogMid, progress * 2)
      } else {
        fogColor.lerpColors(fogMid, fogEnd, (progress - 0.5) * 2)
      }
      scene.fog.color.copy(fogColor)
      renderer.setClearColor(fogColor, 1)

      renderer.render(scene, cam)
    }
    tick()

    // ── Resize ──
    const onResize = () => {
      W = window.innerWidth
      H = window.innerHeight
      cam.aspect = W / H
      cam.updateProjectionMatrix()
      renderer.setSize(W, H)
    }
    window.addEventListener('resize', onResize)

    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onResize)
      disposables.forEach(d => d.dispose())
      renderer.dispose()
    }
  }, [])

  return (
    <canvas
      ref={ref}
      aria-hidden="true"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: -1,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        display: 'block',
      }}
    />
  )
}
