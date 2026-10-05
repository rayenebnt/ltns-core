import {
  createContext, useCallback, useContext, useEffect,
  useMemo, useRef, useState,
} from 'react'
import { createPortal } from 'react-dom'
import { inkOn } from '../hooks/useThermal'

// Parcours client de A à Z : une seule scène 3D, ouvrable depuis n'importe où
// dans la page (hero, nav, section process, pastille flottante).
// Three.js est chargé à la demande pour ne pas alourdir le premier rendu.

export const STEPS = [
  {
    num: '01', temp: 12, color: '#0891b2', shape: 'ico',
    title: 'Premier contact',
    desc: "Vous m'écrivez en deux lignes ce dont vous avez besoin. On s'appelle vingt minutes pour en parler tranquillement. Gratuit, sans engagement.",
    you: 'Décrire votre activité',
    out: 'Un échange de 20 minutes',
  },
  {
    num: '02', temp: 28, color: '#0284c7', shape: 'octa',
    title: 'Devis et cadrage',
    desc: "Sous 48h, vous recevez un devis détaillé : ce qui est inclus, le prix, les délais. Un seul prix, fixé à l'avance, sans surprise en cours de route.",
    you: 'Valider le devis',
    out: 'Devis détaillé + planning',
  },
  {
    num: '03', temp: 46, color: '#65a30d', shape: 'torus',
    title: 'Maquette',
    desc: "Je dessine votre site avant de le construire. Vous voyez les couleurs, les textes, la mise en page. On ajuste ensemble jusqu'à ce que ça vous plaise.",
    you: 'Donner votre avis',
    out: 'Maquette des pages principales',
  },
  {
    num: '04', temp: 68, color: '#ca8a04', shape: 'box',
    title: 'Construction',
    desc: "Je développe votre site pour de vrai : rapide, sécurisé, lisible sur téléphone comme sur ordinateur. Vous suivez l'avancement sur un lien privé.",
    you: 'Fournir vos contenus',
    out: 'Lien de préversion mis à jour',
  },
  {
    num: '05', temp: 86, color: '#ea580c', shape: 'knot',
    title: 'Relecture',
    desc: "Vous testez tout à votre rythme et vous me listez ce qui doit changer. Je corrige. On boucle les derniers détails avant la mise en ligne.",
    you: 'Tester et lister',
    out: 'Aller-retours de corrections inclus',
  },
  {
    num: '06', temp: 99, color: '#dc2626', shape: 'dodeca',
    title: 'Mise en ligne et suivi',
    desc: "Votre site part en ligne. Je vous remets tous les accès, je vous montre comment le gérer, et je reste joignable pour la suite.",
    you: 'Récupérer vos accès',
    out: 'Site en ligne, accès + prise en main',
  },
]

// Texte lisible (noir ou blanc) sur un aplat à la couleur d'une étape
const onStep = hex => inkOn({
  r: parseInt(hex.slice(1, 3), 16),
  g: parseInt(hex.slice(3, 5), 16),
  b: parseInt(hex.slice(5, 7), 16),
})

// L'indice « glissez » se rejoue à chaque ouverture de la visite,
// jusqu'à ce que le visiteur change d'étape.
const HINT_DELAY = 700      // ms avant la première démonstration
const HINT_DURATION = 6600  // trois passages de la main, puis l'indice s'efface

const ParcoursContext = createContext(null)

export function useParcours() {
  const ctx = useContext(ParcoursContext)
  if (!ctx) throw new Error('useParcours doit être appelé dans <ParcoursProvider>')
  return ctx
}

export function ParcoursProvider({ children }) {
  const [open, setOpen] = useState(false)
  const value = useMemo(() => ({
    open,
    openParcours: () => setOpen(true),
    closeParcours: () => setOpen(false),
  }), [open])

  return (
    <ParcoursContext.Provider value={value}>
      {children}
      {open && <ParcoursOverlay onClose={() => setOpen(false)} />}
    </ParcoursContext.Provider>
  )
}

function ParcoursOverlay({ onClose }) {
  const [index, setIndex] = useState(0)
  const canvasRef = useRef(null)
  const indexRef = useRef(0)
  const pointerRef = useRef({ x: 0, y: 0 })

  const next = useCallback(() => setIndex(i => Math.min(STEPS.length - 1, i + 1)), [])
  const prev = useCallback(() => setIndex(i => Math.max(0, i - 1)), [])

  useEffect(() => { indexRef.current = index }, [index])

  // ---------- Indice « glissez pour avancer » ----------
  const [hint, setHint] = useState(false)
  const hintDone = useRef(false)
  useEffect(() => {
    const show = setTimeout(() => { if (!hintDone.current) setHint(true) }, HINT_DELAY)
    const hide = setTimeout(() => setHint(false), HINT_DELAY + HINT_DURATION)
    return () => { clearTimeout(show); clearTimeout(hide) }
  }, [])
  // Dès que le visiteur change d'étape, il a compris : l'indice s'arrête
  useEffect(() => {
    if (index === 0 && !hintDone.current) return
    hintDone.current = true
    setHint(false)
  }, [index])

  // Blocage du scroll de la page tant que la scène est ouverte.
  useEffect(() => {
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = previous }
  }, [])

  // Clavier : flèches pour naviguer, Échap pour fermer.
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') onClose()
      else if (e.key === 'ArrowRight' || e.key === 'ArrowDown') next()
      else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') prev()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose, next, prev])

  // Scène 3D.
  useEffect(() => {
    let disposed = false
    let cleanup = () => {}

    import('three').then((THREE) => {
      const canvas = canvasRef.current
      if (disposed || !canvas) return

      const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
      const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true })
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2))

      // Scène claire, à la couleur de page du site
      const bgColor = getComputedStyle(document.documentElement).getPropertyValue('--bg').trim() || '#f5f3ee'
      const scene = new THREE.Scene()
      scene.fog = new THREE.FogExp2(new THREE.Color(bgColor), 0.045)

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
      const grid = new THREE.GridHelper(220, 110, 0x9fb4bb, 0xcfcac0)
      grid.position.y = -3.4
      grid.material.transparent = true
      grid.material.opacity = 0.6
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
            color, transparent: true, opacity: 0.55, depthWrite: false,
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
          color: 0x6b7280, dashSize: 0.5, gapSize: 0.45,
          transparent: true, opacity: 0.45,
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
        color: 0x6b6b75, size: 0.045, transparent: true, opacity: 0.35, depthWrite: false,
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
  }, [])

  // ---------- Glisser pour changer d'étape (doigt ou souris) ----------
  const [dragX, setDragX] = useState(0)
  const [dragging, setDragging] = useState(false)
  const drag = useRef(null)
  const suppressClick = useRef(false)

  const onPointerDown = (e) => {
    if (e.button > 0 || e.target.closest('button, a')) return
    drag.current = { x: e.clientX, y: e.clientY, dx: 0, active: false, id: e.pointerId }
  }

  const onPointerMove = (e) => {
    pointerRef.current = {
      x: (e.clientX / window.innerWidth) * 2 - 1,
      y: (e.clientY / window.innerHeight) * 2 - 1,
    }
    const d = drag.current
    if (!d || d.id !== e.pointerId) return
    const dx = e.clientX - d.x, dy = e.clientY - d.y
    if (!d.active) {
      if (Math.abs(dx) < 8 || Math.abs(dx) < Math.abs(dy)) return
      d.active = true
      setDragging(true)
      hintDone.current = true
      setHint(false)
      e.currentTarget.setPointerCapture?.(e.pointerId)
    }
    // Résistance aux deux bouts du parcours
    const atEdge = (dx > 0 && indexRef.current === 0) || (dx < 0 && indexRef.current === STEPS.length - 1)
    d.dx = atEdge ? dx * 0.3 : dx
    setDragX(d.dx)
  }

  const onPointerUp = () => {
    const d = drag.current
    drag.current = null
    if (!d?.active) return
    if (d.dx < -60) next()
    else if (d.dx > 60) prev()
    setDragX(0)
    setDragging(false)
    // Le relâchement d'un glissé ne doit pas fermer la scène
    suppressClick.current = true
    setTimeout(() => { suppressClick.current = false }, 60)
  }

  const closeOnClick = () => { if (!suppressClick.current) onClose() }

  const step = STEPS[index]
  const total = String(STEPS.length).padStart(2, '0')

  return createPortal(
    <div
      className="parcours-overlay"
      role="dialog"
      aria-modal="true"
      aria-label="Visite guidée : votre projet de A à Z"
      style={{ '--step-color': step.color }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      onClick={(e) => { if (e.target === e.currentTarget) closeOnClick() }}
    >
      <canvas className="parcours-canvas" ref={canvasRef} aria-hidden="true" onClick={closeOnClick} />

      <div className="parcours-ui">
        <header className="parcours-head">
          <span className="parcours-kicker">
            LTNS<span className="deg">°</span> <span className="sep">//</span> VISITE GUIDÉE
            <span className="parcours-kicker-long"> · DE A À Z</span>
          </span>
          <button type="button" className="parcours-close" onClick={onClose}>
            FERMER <span aria-hidden="true">✕</span>
          </button>
        </header>

        {/* Les étapes en diapositives : la suivante dépasse à droite */}
        <div className="parcours-stage">
          {hint && (
            <div className="parcours-swipe" aria-hidden="true">
              <span className="parcours-swipe-move">
                <span className="parcours-swipe-trail" />
                <svg className="parcours-swipe-hand" viewBox="0 0 24 24">
                  <path d="M22 14a8 8 0 0 1-8 8" />
                  <path d="M18 11v-1a2 2 0 0 0-2-2a2 2 0 0 0-2 2" />
                  <path d="M14 10V9a2 2 0 0 0-2-2a2 2 0 0 0-2 2v1" />
                  <path d="M10 9.5V4a2 2 0 0 0-2-2a2 2 0 0 0-2 2v10" />
                  <path d="M18 11a2 2 0 1 1 4 0v3a8 8 0 0 1-8 8h-2c-2.8 0-4.5-.86-5.99-2.34l-3.6-3.6a2 2 0 0 1 2.83-2.82L7 15" />
                </svg>
              </span>
              <span className="parcours-swipe-txt">
                GLISSEZ POUR AVANCER <span aria-hidden="true">←</span>
              </span>
            </div>
          )}
          <div
            className={`parcours-slider${dragging ? ' is-dragging' : ''}`}
            role="region"
            aria-roledescription="carrousel"
            aria-label="Les étapes de votre projet"
          >
            <div className={`parcours-track${hint ? ' is-hinting' : ''}`} style={{ '--i': index, '--drag': `${dragX}px` }}>
              {STEPS.map((s, i) => {
                const active = i === index
                const last = i === STEPS.length - 1
                return (
                  <article
                    key={s.num}
                    className={`parcours-slide${active ? ' is-active' : ''}${i < index ? ' is-past' : ''}`}
                    style={{ '--step-color': s.color, '--on-step': onStep(s.color) }}
                    aria-roledescription="diapositive"
                    aria-label={`Étape ${i + 1} sur ${STEPS.length} : ${s.title}`}
                    aria-hidden={!active}
                    onClick={() => { if (!active && !suppressClick.current) setIndex(i) }}
                  >
                    <div className="parcours-panel-head">
                      <span>ÉTAPE <b>{s.num}</b> / {total}</span>
                      <span className="parcours-temp" style={{ color: s.color }}>
                        {s.temp}<span className="deg">°</span>
                      </span>
                    </div>
                    <h3>{s.title}</h3>
                    <p>{s.desc}</p>
                    <dl className="parcours-meta">
                      <div>
                        <dt>VOTRE RÔLE</dt>
                        <dd>{s.you}</dd>
                      </div>
                      <div>
                        <dt>CE QUE VOUS RECEVEZ</dt>
                        <dd>{s.out}</dd>
                      </div>
                    </dl>
                    {last && (
                      <a href="#contact" className="parcours-slide-cta" tabIndex={active ? 0 : -1} onClick={onClose}>
                        DEMANDER MON DEVIS <span aria-hidden="true">→</span>
                      </a>
                    )}
                  </article>
                )
              })}
            </div>
          </div>
        </div>

        <footer className="parcours-foot">
          <div className="parcours-progress" aria-hidden="true">
            <i style={{ transform: `scaleX(${(index + 1) / STEPS.length})` }} />
          </div>

          <Arrow dir="prev" index={index} onClick={prev} variant="foot" />

          <span className="parcours-count">
            ÉTAPE <b>{step.num}</b> / {total}
          </span>

          <div className="parcours-dots">
            {STEPS.map((s, i) => (
              <button
                type="button"
                key={s.num}
                className={`parcours-dot ${i === index ? 'active' : ''} ${i < index ? 'done' : ''}`}
                style={{ '--dot-color': s.color, '--on-step': onStep(s.color) }}
                onClick={() => setIndex(i)}
                aria-label={`Étape ${s.num} — ${s.title}`}
                aria-current={i === index ? 'step' : undefined}
              >
                <span>{s.num}</span>
              </button>
            ))}
          </div>

          <span className="parcours-hint">GLISSEZ OU <kbd>←</kbd> <kbd>→</kbd></span>

          <Arrow dir="next" index={index} onClick={next} variant="foot" />
        </footer>
      </div>

      <Arrow dir="prev" index={index} onClick={prev} variant="side" />
      <Arrow dir="next" index={index} onClick={next} variant="side" />
    </div>,
    document.body,
  )
}

/* Flèche de navigation : sur les côtés de l'écran (ordinateur) ou dans le pied (téléphone).
   Au survol, elle annonce l'étape vers laquelle elle mène. */
function Arrow({ dir, index, onClick, variant }) {
  const target = STEPS[dir === 'prev' ? index - 1 : index + 1]
  const label = target
    ? `${dir === 'prev' ? 'Étape précédente' : 'Étape suivante'} : ${target.title}`
    : (dir === 'prev' ? 'Première étape' : 'Dernière étape')

  return (
    <button
      type="button"
      className={`parcours-arrow parcours-arrow--${dir} parcours-arrow--${variant}`}
      onClick={onClick}
      disabled={!target}
      aria-label={label}
      style={target ? { '--arrow-color': target.color } : undefined}
    >
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d={dir === 'prev' ? 'M15 4l-8 8 8 8' : 'M9 4l8 8-8 8'} />
      </svg>
      {target && variant === 'side' && (
        <span className="parcours-arrow-label" aria-hidden="true">
          <small>{dir === 'prev' ? 'PRÉCÉDENT' : 'SUIVANT'} · {target.num}</small>
          {target.title}
        </span>
      )}
    </button>
  )
}
