import { useEffect, useRef } from 'react'
import * as THREE from 'three'
import { gsap } from 'gsap'

export default function Hero({ loaded }) {
  const canvasRef = useRef(null)
  const heroRef = useRef(null)

  // Three.js scene
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const isMobile = window.innerWidth < 768

    const scene = new THREE.Scene()
    const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000)
    camera.position.z = 6

    const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: !isMobile })
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, isMobile ? 1.5 : 2))
    renderer.setSize(window.innerWidth, window.innerHeight)

    // Icosaèdre extérieur
    const geometry = new THREE.IcosahedronGeometry(1.6, isMobile ? 1 : 2)
    const material = new THREE.MeshBasicMaterial({
      color: 0xa855f7,
      wireframe: true,
      transparent: true,
      opacity: 0.5
    })
    const mainObj = new THREE.Mesh(geometry, material)
    scene.add(mainObj)

    // Icosaèdre intérieur
    const innerGeo = new THREE.IcosahedronGeometry(1.2, 0)
    const innerMat = new THREE.MeshBasicMaterial({
      color: 0xc084fc,
      wireframe: true,
      transparent: true,
      opacity: 0.25
    })
    const innerObj = new THREE.Mesh(innerGeo, innerMat)
    mainObj.add(innerObj)

    // Particules
    const pCount = isMobile ? 600 : 1500
    const pGeo = new THREE.BufferGeometry()
    const positions = new Float32Array(pCount * 3)
    for (let i = 0; i < pCount * 3; i += 3) {
      positions[i] = (Math.random() - 0.5) * 18
      positions[i + 1] = (Math.random() - 0.5) * 18
      positions[i + 2] = (Math.random() - 0.5) * 12
    }
    pGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    const pMat = new THREE.PointsMaterial({
      color: 0xa855f7,
      size: 0.018,
      transparent: true,
      opacity: 0.7,
      blending: THREE.AdditiveBlending
    })
    const particles = new THREE.Points(pGeo, pMat)
    scene.add(particles)

    // Mouse parallax
    let targetX = 0, targetY = 0
    const onMouseMove = (e) => {
      targetX = (e.clientX / window.innerWidth - 0.5) * 0.5
      targetY = (e.clientY / window.innerHeight - 0.5) * 0.5
    }
    document.addEventListener('mousemove', onMouseMove)

    // Animation loop
    let t = 0
    let animId
    const animate = () => {
      animId = requestAnimationFrame(animate)
      t += 0.005

      mainObj.rotation.x += (targetY - mainObj.rotation.x) * 0.05 + 0.002
      mainObj.rotation.y += (targetX - mainObj.rotation.y) * 0.05 + 0.003
      mainObj.rotation.z += 0.001
      innerObj.rotation.x -= 0.004
      innerObj.rotation.y -= 0.005

      material.opacity = 0.4 + Math.sin(t * 2) * 0.15
      innerMat.opacity = 0.2 + Math.sin(t * 2 + 1) * 0.1

      particles.rotation.y += 0.0005
      particles.rotation.x += 0.0002

      camera.position.x += (targetX * 0.6 - camera.position.x) * 0.05
      camera.position.y += (-targetY * 0.6 - camera.position.y) * 0.05
      camera.lookAt(0, 0, 0)

      renderer.render(scene, camera)
    }
    animate()

    // Resize
    const onResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight
      camera.updateProjectionMatrix()
      renderer.setSize(window.innerWidth, window.innerHeight)
    }
    window.addEventListener('resize', onResize)

    return () => {
      cancelAnimationFrame(animId)
      document.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('resize', onResize)
      geometry.dispose()
      material.dispose()
      innerGeo.dispose()
      innerMat.dispose()
      pGeo.dispose()
      pMat.dispose()
      renderer.dispose()
    }
  }, [])

  // GSAP entry animation après loader
  useEffect(() => {
    if (!loaded) return

    const tl = gsap.timeline()
    tl.from('.hero-tag', { y: 20, opacity: 0, duration: 0.8, ease: 'power3.out' })
      .from('.hero h1 .line span', { y: '110%', duration: 1.1, stagger: 0.12, ease: 'power4.out' }, '-=0.4')
      .from('.hero-sub', { y: 20, opacity: 0, duration: 0.8, ease: 'power3.out' }, '-=0.6')
      .from('.hero-ctas .btn', { y: 20, opacity: 0, duration: 0.6, stagger: 0.1, ease: 'power3.out' }, '-=0.4')
      .from('.hero-scroll', { opacity: 0, duration: 0.8 }, '-=0.2')
      .from('nav', { y: -40, opacity: 0, duration: 0.8, ease: 'power3.out' }, '-=0.6')
  }, [loaded])

  return (
    <header className="hero" ref={heroRef}>
      <canvas id="three-canvas" ref={canvasRef} aria-hidden="true"></canvas>
      <div className="hero-content">
        <div className="hero-tag">Disponible pour de nouveaux projets</div>
        <h1>
          <span className="line"><span>Sites web.</span></span>
          <span className="line"><span>Logiciels. Apps.</span></span>
          <span className="line"><span><em>Sur-mesure.</em></span></span>
        </h1>
        <p className="hero-sub">
          LTNS° — Création de sites internet, logiciels et applications mobiles
          pour particuliers et professionnels. Le bon degré, sans compromis.
        </p>
        <div className="hero-ctas">
          <a href="#services" className="btn btn-primary">
            Voir mes services <span className="arrow">→</span>
          </a>
          <a href="#contact" className="btn btn-ghost">Demander un devis</a>
        </div>
      </div>
      <div className="hero-scroll">scroll</div>
    </header>
  )
}
