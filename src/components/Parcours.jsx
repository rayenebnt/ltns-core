import { useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

// Parcours client de A à Z : déclencheur animé dans le hero + scène 3D plein écran.
// Three.js est chargé à la demande (import dynamique) pour ne pas alourdir le
// premier rendu de la page.

export const STEPS = [
  {
    num: '01', temp: 12, color: '#4dd0e1', shape: 'ico',
    title: 'Premier contact',
    desc: "Vous m'écrivez en deux lignes ce dont vous avez besoin. On s'appelle vingt minutes pour en parler tranquillement. Gratuit, sans engagement.",
    you: 'Décrire votre activité',
    out: 'Un échange de 20 minutes',
  },
  {
    num: '02', temp: 28, color: '#38bdf8', shape: 'octa',
    title: 'Devis et cadrage',
    desc: "Sous 48h, vous recevez un devis détaillé : ce qui est inclus, le prix, les délais. Un seul prix, fixé à l'avance, sans surprise en cours de route.",
    you: 'Valider le devis',
    out: 'Devis détaillé + planning',
  },
  {
    num: '03', temp: 46, color: '#a3e635', shape: 'torus',
    title: 'Maquette',
    desc: "Je dessine votre site avant de le construire. Vous voyez les couleurs, les textes, la mise en page. On ajuste ensemble jusqu'à ce que ça vous plaise.",
    you: 'Donner votre avis',
    out: 'Maquette des pages principales',
  },
  {
    num: '04', temp: 68, color: '#facc15', shape: 'box',
    title: 'Construction',
    desc: "Je développe votre site pour de vrai : rapide, sécurisé, lisible sur téléphone comme sur ordinateur. Vous suivez l'avancement sur un lien privé.",
    you: 'Fournir vos contenus',
    out: 'Lien de préversion mis à jour',
  },
  {
    num: '05', temp: 86, color: '#fb923c', shape: 'knot',
    title: 'Relecture',
    desc: "Vous testez tout à votre rythme et vous me listez ce qui doit changer. Je corrige. On boucle les derniers détails avant la mise en ligne.",
    you: 'Tester et lister',
    out: 'Aller-retours de corrections inclus',
  },
  {
    num: '06', temp: 99, color: '#ef4444', shape: 'dodeca',
    title: 'Mise en ligne et suivi',
    desc: "Votre site part en ligne. Je vous remets tous les accès, je vous montre comment le gérer, et je reste joignable pour la suite.",
    you: 'Récupérer vos accès',
    out: 'Site en ligne, accès + prise en main',
  },
]

export default function Parcours() {
  const [open, setOpen] = useState(false)
  const [index, setIndex] = useState(0)
  const canvasRef = useRef(null)
  const indexRef = useRef(0)
  const pointerRef = useRef({ x: 0, y: 0 })

  const close = useCallback(() => setOpen(false), [])
  const next = useCallback(() => setIndex(i => Math.min(STEPS.length - 1, i + 1)), [])
  const prev = useCallback(() => setIndex(i => Math.max(0, i - 1)), [])

  useEffect(() => { indexRef.current = index }, [index])

  // Ouverture : on repart de l'étape 01 et on bloque le scroll de la page.
  useEffect(() => {
    if (!open) return
    setIndex(0)
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = prevOverflow }
  }, [open])

  // Clavier : flèches pour naviguer, Échap pour fermer.
  useEffect(() => {
    if (!open) return
    const onKey = (e) => {
      if (e.key === 'Escape') close()
      else if (e.key === 'ArrowRight' || e.key === 'ArrowDown') next()
      else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') prev()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, close, next, prev])

  // Scène 3D — montée à l'ouverture, détruite à la fermeture.
  useEffect(() => {
    if (!open) return
    let disposed = false
    let cleanup = () => {}

    import('three').then((THREE) => {
      const canvas = canvasRef.current
      if (disposed || !canvas) return

      const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
      const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true })
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2))

      const scene = new THREE.Scene()
      scene.fog = new THREE.FogExp2(0x0a0a0c, 0.045)

      const camera = new THREE.PerspectiveCamera(46, 1, 0.1, 200)
      camera.position.set(0, 2.4, 8)

      // Position de chaque étape : on avance et on monte en température.
      const stationAt = (i) => new THREE.Vector3(
        i * 6,
        i * 0.5,
        Math.sin(i * 1.15) * 2.2,
      )

      const geometryFor = (shape) => {
        switch (shape) {
          case 'octa': return new THREE.OctahedronGeometry(1.5, 0)
          case 'torus': return new THREE.TorusGeometry(1.15, 0.42, 12, 32)
          case 'box': return new THREE.BoxGeometry(2, 2, 2)
          case 'knot': return new THREE.TorusKnotGeometry(1.05, 0.32, 96, 12)
          case 'dodeca': return new THREE.DodecahedronGeometry(1.5, 0)
          default: return new THREE.IcosahedronGeometry(1.5, 0)
        }
      }

      const disposables = []
      const track = (obj) => { disposables.push(obj); return obj }

      // Sol : grille d'atelier, discrète.
      const grid = new THREE.GridHelper(220, 110, 0x1d3b44, 0x141419)
      grid.position.y = -3.4
      grid.material.transparent = true
      grid.material.opacity = 0.28
      scene.add(grid)
      disposables.push(grid.geometry, grid.material)

      // Les stations.
      const stations = STEPS.map((step, i) => {
        const color = new THREE.Color(step.color)
        const group = new THREE.Group()
        group.position.copy(stationAt(i))

        const shell = new THREE.LineSegments(
          track(new THREE.EdgesGeometry(track(geometryFor(step.shape)))),
          track(new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.9 })),
        )
        group.add(shell)

        const core = new THREE.Mesh(
          track(new THREE.IcosahedronGeometry(0.55, 1)),
          track(new THREE.MeshBasicMaterial({
            color, transparent: true, opacity: 0.55,
            blending: THREE.AdditiveBlending, depthWrite: false,
          })),
        )
        group.add(core)

        const halo = new THREE.Mesh(
          track(new THREE.RingGeometry(2.1, 2.16, 64)),
          track(new THREE.MeshBasicMaterial({
            color, transparent: true, opacity: 0.5, side: THREE.DoubleSide,
          })),
        )
        halo.rotation.x = -Math.PI / 2
        halo.position.y = -2.2
        group.add(halo)

        const orbit = new THREE.Mesh(
          track(new THREE.TorusGeometry(2.35, 0.012, 6, 96)),
          track(new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.35 })),
        )
        orbit.rotation.x = Math.PI / 2.6
        group.add(orbit)

        scene.add(group)
        return { group, shell, core, halo, orbit, spin: 0.15 + i * 0.03 }
      })

      // Fil qui relie les étapes, comme la courbe thermique du site.
      const curve = new THREE.CatmullRomCurve3(STEPS.map((_, i) => stationAt(i)))
      const thread = new THREE.Line(
        track(new THREE.BufferGeometry().setFromPoints(curve.getPoints(280))),
        track(new THREE.LineDashedMaterial({
          color: 0x8899aa, dashSize: 0.5, gapSize: 0.45,
          transparent: true, opacity: 0.35,
        })),
      )
      thread.computeLineDistances()
      scene.add(thread)

      // Poussière : donne la profondeur.
      const dustCount = 700
      const dustPos = new Float32Array(dustCount * 3)
      for (let i = 0; i < dustCount; i++) {
        dustPos[i * 3] = (Math.random() - 0.1) * 60
        dustPos[i * 3 + 1] = (Math.random() - 0.35) * 26
        dustPos[i * 3 + 2] = (Math.random() - 0.5) * 34
      }
      const dustGeo = track(new THREE.BufferGeometry())
      dustGeo.setAttribute('position', new THREE.BufferAttribute(dustPos, 3))
      const dust = new THREE.Points(dustGeo, track(new THREE.PointsMaterial({
        color: 0xffffff, size: 0.045, transparent: true, opacity: 0.35, depthWrite: false,
      })))
      scene.add(dust)

      // En portrait la fiche occupe le bas de l'écran : on recule la caméra
      // et on vise plus bas pour garder la forme dans la moitié haute.
      let portrait = false
      const resize = () => {
        const w = canvas.clientWidth || window.innerWidth
        const h = canvas.clientHeight || window.innerHeight
        renderer.setSize(w, h, false)
        camera.aspect = w / h
        portrait = camera.aspect < 1
        camera.updateProjectionMatrix()
      }
      resize()
      window.addEventListener('resize', resize)

      const camTarget = new THREE.Vector3()
      const lookTarget = new THREE.Vector3()
      const look = new THREE.Vector3().copy(stationAt(0))
      const clock = new THREE.Clock()
      let raf = 0

      const render = () => {
        raf = requestAnimationFrame(render)
        const dt = Math.min(clock.getDelta(), 0.05)
        const t = clock.getElapsedTime()
        const active = indexRef.current
        const p = pointerRef.current

        stations.forEach((s, i) => {
          const isActive = i === active
          if (!reduce) {
            s.group.rotation.y += dt * s.spin * (isActive ? 2.6 : 1)
            s.shell.rotation.x += dt * 0.18
            s.orbit.rotation.z += dt * (isActive ? 0.9 : 0.28)
          }
          const scale = isActive ? 1 : 0.62
          s.group.scale.lerp({ x: scale, y: scale, z: scale }, 1 - Math.pow(0.001, dt))
          s.shell.material.opacity += ((isActive ? 1 : 0.28) - s.shell.material.opacity) * 0.08
          s.core.material.opacity += ((isActive ? 0.6 + Math.sin(t * 2.4) * 0.12 : 0.12) - s.core.material.opacity) * 0.08
          s.halo.material.opacity += ((isActive ? 0.55 : 0.12) - s.halo.material.opacity) * 0.08
          s.orbit.material.opacity += ((isActive ? 0.45 : 0.08) - s.orbit.material.opacity) * 0.08
          s.halo.scale.setScalar(isActive ? 1 + Math.sin(t * 1.6) * 0.04 : 1)
        })

        const focus = stationAt(active)
        camTarget.set(
          focus.x + (portrait ? 0.4 : 3.1) + p.x * 1.4,
          focus.y + (portrait ? 3.2 : 2.2) - p.y * 1.1,
          focus.z + (portrait ? 12.5 : 8.2),
        )
        camera.position.lerp(camTarget, 1 - Math.pow(0.004, dt))
        lookTarget.set(focus.x, focus.y - (portrait ? 2.8 : 0.4), focus.z)
        look.lerp(lookTarget, 1 - Math.pow(0.004, dt))
        camera.lookAt(look)

        if (!reduce) dust.rotation.y += dt * 0.01

        renderer.render(scene, camera)
      }
      render()

      cleanup = () => {
        cancelAnimationFrame(raf)
        window.removeEventListener('resize', resize)
        disposables.forEach(d => d.dispose && d.dispose())
        renderer.dispose()
      }
    })

    return () => { disposed = true; cleanup() }
  }, [open])

  const onPointerMove = (e) => {
    pointerRef.current = {
      x: (e.clientX / window.innerWidth) * 2 - 1,
      y: (e.clientY / window.innerHeight) * 2 - 1,
    }
  }

  const step = STEPS[index]
  const last = index === STEPS.length - 1

  return (
    <>
      <button type="button" className="parcours-trigger" onClick={() => setOpen(true)}>
        <span className="parcours-cube" aria-hidden="true">
          <i /><i /><i /><i /><i /><i />
        </span>
        <span className="parcours-trigger-text">
          <b>Comment ça se passe&nbsp;?</b>
          <span>Le parcours client de A à Z · {STEPS.length} étapes</span>
        </span>
        <span className="parcours-trigger-arrow" aria-hidden="true">→</span>
      </button>

      {open && createPortal(
        <div
          className="parcours-overlay"
          role="dialog"
          aria-modal="true"
          aria-label="Le parcours client de A à Z"
          onMouseMove={onPointerMove}
          onClick={(e) => { if (e.target === e.currentTarget) close() }}
        >
          <canvas className="parcours-canvas" ref={canvasRef} aria-hidden="true" onClick={close} />

          <div className="parcours-ui">
            <header className="parcours-head">
              <span className="parcours-kicker">
                LTNS<span className="deg">°</span> <span className="sep">//</span> PARCOURS CLIENT
                <span className="parcours-kicker-long"> · DE A À Z</span>
              </span>
              <button type="button" className="parcours-close" onClick={close}>
                FERMER <span aria-hidden="true">✕</span>
              </button>
            </header>

            <div className="parcours-panel" key={step.num} style={{ '--step-color': step.color }}>
              <div className="parcours-panel-head">
                <span>ÉTAPE <b>{step.num}</b> / {String(STEPS.length).padStart(2, '0')}</span>
                <span className="parcours-temp" style={{ color: step.color }}>
                  {step.temp}<span className="deg">°</span>
                </span>
              </div>
              <h3>{step.title}</h3>
              <p>{step.desc}</p>
              <dl className="parcours-meta">
                <div>
                  <dt>VOTRE RÔLE</dt>
                  <dd>{step.you}</dd>
                </div>
                <div>
                  <dt>CE QUE VOUS RECEVEZ</dt>
                  <dd>{step.out}</dd>
                </div>
              </dl>
            </div>

            <footer className="parcours-foot">
              <button
                type="button"
                className="parcours-nav"
                onClick={prev}
                disabled={index === 0}
              >
                <span aria-hidden="true">←</span> PRÉCÉDENT
              </button>

              <div className="parcours-dots">
                {STEPS.map((s, i) => (
                  <button
                    type="button"
                    key={s.num}
                    className={`parcours-dot ${i === index ? 'active' : ''} ${i < index ? 'done' : ''}`}
                    style={{ '--dot-color': s.color }}
                    onClick={() => setIndex(i)}
                    aria-label={`Étape ${s.num} — ${s.title}`}
                    aria-current={i === index ? 'step' : undefined}
                  >
                    <span>{s.num}</span>
                  </button>
                ))}
              </div>

              {last ? (
                <a href="#contact" className="parcours-nav parcours-nav-cta" onClick={close}>
                  DEMANDER UN DEVIS <span aria-hidden="true">→</span>
                </a>
              ) : (
                <button type="button" className="parcours-nav parcours-nav-cta" onClick={next}>
                  SUIVANT <span aria-hidden="true">→</span>
                </button>
              )}
            </footer>
          </div>
        </div>,
        document.body,
      )}
    </>
  )
}
