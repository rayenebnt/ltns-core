import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { gsap } from 'gsap'
import { tempColor } from '../hooks/useThermal'

export const EMAIL = 'ltnscore@gmail.com'
const PHONE = '0625206493'
const PHONE_INTL = '+33625206493'

// Choix proposés dans le devis — modifiables ici
const PROJETS = [
  { value: 'Site de présentation', hint: 'Vitrine, artisan, indépendant', icon: 'site' },
  { value: 'Site avec boutique ou espace client', hint: 'Vente en ligne, comptes clients', icon: 'shop' },
  { value: 'Logiciel pour mon métier', hint: 'Outil sur mesure, gestion', icon: 'tool' },
  { value: 'Application mobile', hint: 'iPhone et Android', icon: 'mobile' },
  { value: 'Autre', hint: 'On en parle ensemble', icon: 'other' },
]

const BUDGETS = [
  { value: 'Moins de 500€', level: 1 },
  { value: '500 — 1 000€', level: 2 },
  { value: '1 000 — 3 000€', level: 3 },
  { value: '3 000€ et +', level: 4 },
  { value: 'Je ne sais pas encore', level: 0 },
]

const FONCTIONS = ['Formulaire de contact', 'Prise de rendez-vous', 'Galerie photos', 'Paiement en ligne', 'Espace client', 'Plusieurs langues']

// Chaque étape a sa température : le formulaire « chauffe » à mesure qu'on avance
const STEPS = [
  { key: 'projet', label: 'Projet', title: 'Quel est votre projet ?', temp: 12 },
  { key: 'budget', label: 'Budget', title: 'Quel budget envisagez-vous ?', temp: 38 },
  { key: 'message', label: 'Détails', title: "Dites-m'en un peu plus", temp: 60 },
  { key: 'coords', label: 'Contact', title: 'Où vous envoyer le devis ?', temp: 82 },
]

export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
// Même adresse de réception pour le devis et les demandes de formule
export const FORMSPREE_URL = 'https://formspree.io/f/mvzlnbop'
export const makeReference = (d = new Date()) =>
  `LTNS-${String(d.getFullYear()).slice(2)}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}-${Math.floor(1000 + Math.random() * 9000)}`
const EMPTY = { projet: '', formule: '', budget: '', fonctions: [], message: '', nom: '', email: '' }
const pos = temp => (temp - 12) / 87 // position 0 → 1 sur la jauge

// Ouvre le devis avec un type de projet déjà choisi (ex. depuis une carte de service)
// et, depuis les tarifs, la formule choisie
export const prefillDevis = (projet, { formule = '' } = {}) =>
  window.dispatchEvent(new CustomEvent('devis:prefill', { detail: { projet, formule } }))

const prefersReducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches

function heatLabel(t) {
  if (t < 25) return 'FROID'
  if (t < 50) return 'TIÈDE'
  if (t < 75) return 'CHAUD'
  if (t < 95) return 'BRÛLANT'
  return 'PRÊT'
}

function Icon({ name }) {
  const common = { width: 28, height: 28, viewBox: '0 0 28 28', fill: 'none', stroke: 'currentColor', strokeWidth: 1.4, 'aria-hidden': true }
  switch (name) {
    case 'site':
      return <svg {...common}><rect x="3" y="5" width="22" height="17" /><path d="M3 10h22M7 14h8M7 18h5" /></svg>
    case 'shop':
      return <svg {...common}><path d="M4 9h20l-2 13H6L4 9z" /><path d="M10 12V7a4 4 0 0 1 8 0v5" /></svg>
    case 'tool':
      return <svg {...common}><rect x="3" y="5" width="22" height="17" /><path d="M9 11l-3 3 3 3M19 11l3 3-3 3M15 10l-2 8" /></svg>
    case 'mobile':
      return <svg {...common}><rect x="8" y="3" width="12" height="22" rx="2" /><path d="M12.5 21h3" /></svg>
    default:
      return <svg {...common}><circle cx="14" cy="14" r="10" /><path d="M9.5 14h.01M14 14h.01M18.5 14h.01" strokeWidth="2.4" strokeLinecap="round" /></svg>
  }
}

function Gauge({ level }) {
  return (
    <span className="devis-gauge" aria-hidden="true">
      {[1, 2, 3, 4].map(i => <i key={i} className={level >= i ? 'on' : ''} style={{ '--k': i }} />)}
    </span>
  )
}

/* Texte qui se « décode » comme sur un instrument */
const GLYPHS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789°#%/<>'
function Scramble({ text, className }) {
  const [shown, setShown] = useState(text)
  useEffect(() => {
    if (prefersReducedMotion()) { setShown(text); return }
    let frame = 0, raf
    const total = 22
    const tick = () => {
      frame++
      const reveal = Math.floor((frame / total) * text.length)
      setShown(text.split('').map((c, i) =>
        i < reveal || c === ' ' ? c : GLYPHS[(Math.random() * GLYPHS.length) | 0]).join(''))
      if (frame < total) raf = requestAnimationFrame(tick)
      else setShown(text)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [text])
  return <span className={className} aria-label={text}><span aria-hidden="true">{shown}</span></span>
}

/* Étincelles : petits carrés aux couleurs thermiques, dessinés sur un canvas */
const OFF = 90
function useSparks(canvasRef) {
  const parts = useRef([])
  const raf = useRef(0)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const resize = () => {
      const r = canvas.parentElement.getBoundingClientRect()
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      canvas.width = (r.width + OFF * 2) * dpr
      canvas.height = (r.height + OFF * 2) * dpr
      canvas.getContext('2d').setTransform(dpr, 0, 0, dpr, 0, 0)
    }
    resize()
    const ro = new ResizeObserver(resize)
    ro.observe(canvas.parentElement)
    return () => { ro.disconnect(); cancelAnimationFrame(raf.current) }
  }, [canvasRef])

  const loop = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    parts.current = parts.current.filter(p => p.life > 0)
    for (const p of parts.current) {
      p.vy += 0.16
      p.vx *= 0.985
      p.x += p.vx
      p.y += p.vy
      p.rot += p.vr
      p.life -= 1
      ctx.save()
      ctx.globalAlpha = Math.min(1, p.life / 30)
      ctx.translate(p.x, p.y)
      ctx.rotate(p.rot)
      ctx.fillStyle = p.color
      ctx.shadowColor = p.color
      ctx.shadowBlur = 8
      ctx.fillRect(-p.s / 2, -p.s / 2, p.s, p.s)
      ctx.restore()
    }
    raf.current = parts.current.length ? requestAnimationFrame(loop) : 0
  }, [canvasRef])

  return useCallback((x, y, { count = 18, power = 5, temp = 60, spread = 0.6 } = {}) => {
    if (prefersReducedMotion()) return
    for (let i = 0; i < count; i++) {
      const a = Math.random() * Math.PI * 2
      const v = power * (0.4 + Math.random() * 0.8)
      const c = tempColor(Math.min(1, Math.max(0, pos(temp + (Math.random() - 0.5) * 40))))
      parts.current.push({
        x: x + OFF, y: y + OFF,
        vx: Math.cos(a) * v,
        vy: Math.sin(a) * v * spread - power * 0.5,
        s: 3 + Math.random() * 5,
        rot: Math.random() * 6, vr: (Math.random() - 0.5) * 0.4,
        life: 45 + Math.random() * 40,
        color: `rgb(${c.r}, ${c.g}, ${c.b})`,
      })
    }
    if (!raf.current) raf.current = requestAnimationFrame(loop)
  }, [loop])
}

/* Thermostat : jauge graduée, aiguille et lecture de température */
function Thermostat({ readoutRef, labelRef, step, sent, goTo }) {
  return (
    <div className="thermo">
      <div className="thermo-top">
        <span className="thermo-name">THERMOSTAT DU PROJET</span>
        <span className="thermo-read">
          <b ref={readoutRef}>12.0</b><i>°</i>
          <span ref={labelRef} className="thermo-state">FROID</span>
        </span>
      </div>
      <div className="thermo-track">
        <div className="thermo-ticks" aria-hidden="true">
          {Array.from({ length: 30 }, (_, i) => <i key={i} className={i % 5 === 0 ? 'major' : ''} />)}
        </div>
        <div className="thermo-fill" />
        <div className="thermo-needle" aria-hidden="true">
          <svg viewBox="0 0 120 120"><rect x="55" y="6" width="10" height="18" rx="1" /><circle cx="60" cy="72" r="38" /></svg>
        </div>
      </div>
      <ol className="thermo-steps">
        {STEPS.map((s, i) => {
          const done = sent || i < step
          const reachable = !sent && i < step
          return (
            <li key={s.key} style={{ left: `${pos(s.temp) * 100}%` }} className={`${done ? 'done' : ''} ${i === step && !sent ? 'active' : ''}`}>
              <button type="button" onClick={() => reachable && goTo(i)} disabled={!reachable} aria-current={i === step ? 'step' : undefined}>
                <span className="dot">{done ? '✓' : i + 1}</span>
                <span className="lbl">{s.label}</span>
              </button>
            </li>
          )
        })}
      </ol>
    </div>
  )
}

/* Ticket imprimé après l'envoi */
function Ticket({ data, reference, onRestart }) {
  const ref = useRef(null)
  const bars = useRef(Array.from({ length: 46 }, (_, i) => 1 + ((reference.charCodeAt(i % reference.length) * (i + 3)) % 4)))

  useLayoutEffect(() => {
    if (prefersReducedMotion()) return
    const el = ref.current
    const ctx = gsap.context(() => {
      const tl = gsap.timeline()
      tl.fromTo(el, { clipPath: 'inset(0% 0% 100% 0%)' }, { clipPath: 'inset(0% 0% 0% 0%)', duration: 1.3, ease: 'steps(14)', clearProps: 'clipPath' })
        .fromTo('.tk-line', { opacity: 0, x: -10 }, { opacity: 1, x: 0, duration: 0.25, stagger: 0.08 }, 0.1)
        .fromTo('.tk-bars i', { scaleY: 0 }, { scaleY: 1, duration: 0.3, stagger: 0.008, ease: 'power2.out' }, 0.9)
        .fromTo('.tk-stamp', { scale: 2.6, opacity: 0, rotate: -24 }, { scale: 1, opacity: 1, rotate: -9, duration: 0.35, ease: 'power4.in' }, 1.5)
        .fromTo(el, { x: 0 }, { x: 5, duration: 0.05, repeat: 3, yoyo: true }, 1.85)
        .fromTo('.tk-after', { opacity: 0, y: 12 }, { opacity: 1, y: 0, duration: 0.5 }, 2.0)
    }, el.parentElement)
    return () => ctx.revert()
  }, [])

  const first = data.nom.trim().split(' ')[0]
  const rows = [
    ['PROJET', data.projet],
    data.formule ? ['FORMULE', data.formule] : null,
    ['BUDGET', data.budget],
    data.fonctions.length ? ['FONCTIONS', data.fonctions.join(', ')] : null,
    ['CONTACT', `${data.nom.trim()} · ${data.email.trim()}`],
  ].filter(Boolean)

  return (
    <div className="devis-sent" role="status">
      <div className="ticket" ref={ref}>
        <div className="tk-line tk-head"><b>LTNS°</b><span>DEMANDE DE DEVIS</span></div>
        <div className="tk-line tk-ref"><span>RÉF.</span><b>{reference}</b></div>
        <div className="tk-line tk-sep" />
        {rows.map(([k, v]) => (
          <div className="tk-line tk-row" key={k}><span>{k}</span><b>{v}</b></div>
        ))}
        <div className="tk-line tk-sep" />
        <div className="tk-line tk-row"><span>TEMPÉRATURE</span><b className="tk-hot">99.0° · PRÊT</b></div>
        <div className="tk-line tk-row"><span>RÉPONSE</span><b>SOUS 48H, ÉCRITE À LA MAIN</b></div>
        <div className="tk-bars" aria-hidden="true">{bars.current.map((w, i) => <i key={i} style={{ width: w * 2 }} />)}</div>
        <div className="tk-stamp" aria-hidden="true">REÇU ✓</div>
      </div>
      <div className="tk-after">
        <p>Merci {first} ! Votre demande est bien arrivée. Je reviens vers vous sous 48h à <b>{data.email.trim()}</b>.</p>
        <button type="button" className="btn btn-ghost" onClick={onRestart}>
          Nouvelle demande <span className="arrow">↺</span>
        </button>
      </div>
    </div>
  )
}

export default function Contact() {
  const [step, setStep] = useState(0)
  const [data, setData] = useState(EMPTY)
  const [errors, setErrors] = useState({})
  const [status, setStatus] = useState('idle')
  const [reference, setReference] = useState('')
  const [shake, setShake] = useState(0)

  const formRef = useRef(null)
  const panelRef = useRef(null)
  const canvasRef = useRef(null)
  const readoutRef = useRef(null)
  const labelRef = useRef(null)
  const submitFillRef = useRef(null)
  const heat = useRef({ t: 12 })
  const dirRef = useRef(1)
  const leaving = useRef(false)
  const advanceTimer = useRef(null)
  const burst = useSparks(canvasRef)

  useEffect(() => () => clearTimeout(advanceTimer.current), [])

  // Pré-remplissage depuis le reste du site : on passe directement au budget
  useEffect(() => {
    const onPrefill = (e) => {
      const { projet, formule = '' } = e.detail || {}
      const known = PROJETS.some(p => p.value === projet)
      if (!known && !formule) return
      clearTimeout(advanceTimer.current)
      setStatus('idle')
      setErrors({})
      setData(d => ({ ...(d.nom || d.email ? d : EMPTY), projet: known ? projet : '', formule }))
      dirRef.current = 1
      setStep(known ? 1 : 0)
    }
    window.addEventListener('devis:prefill', onPrefill)
    return () => window.removeEventListener('devis:prefill', onPrefill)
  }, [])

  // ---------- Température : couleur, jauge et lecture ----------
  const paintHeat = useCallback(() => {
    const form = formRef.current
    if (!form) return
    const t = heat.current.t
    const c = tempColor(Math.min(1, Math.max(0, pos(t))))
    form.style.setProperty('--heat', `rgb(${c.r}, ${c.g}, ${c.b})`)
    form.style.setProperty('--heat-rgb', `${c.r}, ${c.g}, ${c.b}`)
    form.style.setProperty('--p', pos(t).toFixed(4))
    if (readoutRef.current) readoutRef.current.textContent = t.toFixed(1)
    if (labelRef.current) labelRef.current.textContent = heatLabel(t)
  }, [])

  const emailOk = EMAIL_RE.test(data.email.trim())
  let target = STEPS[step].temp
  if (step === 0 && data.projet) target = 30
  if (step === 1 && data.budget) target = 52
  if (step === 2) target = 60 + Math.min(18, data.message.trim().length / 12 + data.fonctions.length * 3)
  if (step === 3) target = 82 + (data.nom.trim() ? 5 : 0) + (emailOk ? 6 : 0)
  if (status === 'sending') target = 97
  if (status === 'sent') target = 99

  useEffect(() => {
    if (prefersReducedMotion()) { heat.current.t = target; paintHeat(); return }
    const tw = gsap.to(heat.current, {
      t: target,
      duration: status === 'sending' ? 1.2 : 0.9,
      ease: status === 'sending' ? 'power1.out' : 'back.out(1.8)',
      onUpdate: paintHeat,
    })
    return () => tw.kill()
  }, [target, status, paintHeat])

  useLayoutEffect(() => { paintHeat() }, [paintHeat])

  // ---------- Transitions entre étapes ----------
  useLayoutEffect(() => {
    const panel = panelRef.current
    if (!panel || prefersReducedMotion()) return
    const ctx = gsap.context(() => {
      gsap.fromTo('[data-anim]',
        { opacity: 0, y: 36, x: dirRef.current * 40, rotateX: -60, filter: 'blur(6px)' },
        { opacity: 1, y: 0, x: 0, rotateX: 0, filter: 'blur(0px)', duration: 0.75, stagger: 0.06, ease: 'back.out(1.4)', clearProps: 'transform,filter,opacity' })
    }, panel)
    return () => ctx.revert()
  }, [step, status])

  useEffect(() => {
    if (!shake || prefersReducedMotion()) return
    const els = panelRef.current?.querySelectorAll('.field.invalid')
    if (els?.length) gsap.fromTo(els, { x: 0 }, { x: 8, duration: 0.06, repeat: 5, yoyo: true, clearProps: 'x' })
  }, [shake])

  // Met le focus sur le premier champ de l'étape (sans faire sauter la page)
  useEffect(() => {
    if (step < 2 || status !== 'idle') return
    const el = panelRef.current?.querySelector('textarea, input[type="text"]')
    const id = setTimeout(() => el?.focus({ preventScroll: true }), 350)
    return () => clearTimeout(id)
  }, [step, status])

  const goTo = useCallback((next) => {
    if (leaving.current || next === step) return
    clearTimeout(advanceTimer.current)
    dirRef.current = next > step ? 1 : -1
    const items = panelRef.current?.querySelectorAll('[data-anim]')
    if (prefersReducedMotion() || !items?.length) { setStep(next); return }
    leaving.current = true
    gsap.to(items, {
      opacity: 0, y: -20, x: -dirRef.current * 36, filter: 'blur(6px)',
      duration: 0.26, stagger: 0.025, ease: 'power2.in',
      onComplete: () => { leaving.current = false; setStep(next) },
    })
  }, [step])

  // ---------- Interactions sur les cartes ----------
  const localPoint = (e, el) => {
    const f = formRef.current.getBoundingClientRect()
    if (e && e.clientX) return { x: e.clientX - f.left, y: e.clientY - f.top }
    const r = el.getBoundingClientRect()
    return { x: r.left + r.width / 2 - f.left, y: r.top + r.height / 2 - f.top }
  }

  const tilt = (e) => {
    if (e.pointerType !== 'mouse') return
    const el = e.currentTarget, r = el.getBoundingClientRect()
    const px = (e.clientX - r.left) / r.width, py = (e.clientY - r.top) / r.height
    el.style.setProperty('--mx', `${px * 100}%`)
    el.style.setProperty('--my', `${py * 100}%`)
    el.style.setProperty('--rx', `${(0.5 - py) * 8}deg`)
    el.style.setProperty('--ry', `${(px - 0.5) * 10}deg`)
  }
  const untilt = (e) => {
    e.currentTarget.style.setProperty('--rx', '0deg')
    e.currentTarget.style.setProperty('--ry', '0deg')
  }

  const lastPointer = useRef(null)
  const pick = (key, value, cardEl) => {
    setData(d => ({ ...d, [key]: value }))
    const card = cardEl
    if (card && !prefersReducedMotion()) {
      const { x, y } = localPoint(lastPointer.current, card)
      burst(x, y, { count: 22, power: 5.5, temp: heat.current.t + 20 })
      const r = card.getBoundingClientRect(), f = formRef.current.getBoundingClientRect()
      const ring = document.createElement('span')
      ring.className = 'devis-ripple'
      ring.style.left = `${x - (r.left - f.left)}px`
      ring.style.top = `${y - (r.top - f.top)}px`
      card.appendChild(ring)
      gsap.fromTo(ring, { scale: 0, opacity: 0.9 }, { scale: 9, opacity: 0, duration: 0.8, ease: 'power2.out', onComplete: () => ring.remove() })
      gsap.fromTo(card, { scale: 0.97 }, { scale: 1, duration: 0.5, ease: 'back.out(3)', clearProps: 'scale' })
    }
    lastPointer.current = null
    clearTimeout(advanceTimer.current)
    advanceTimer.current = setTimeout(() => goTo(step + 1), prefersReducedMotion() ? 300 : 700)
  }

  const toggleFonction = (f, e) => {
    const on = !data.fonctions.includes(f)
    setData(d => ({ ...d, fonctions: on ? [...d.fonctions, f] : d.fonctions.filter(x => x !== f) }))
    if (on) {
      const { x, y } = localPoint(e, e.currentTarget)
      burst(x, y, { count: 10, power: 3.5, temp: heat.current.t + 10 })
    }
  }

  const update = (e) => {
    const { name, value } = e.target
    setData(d => ({ ...d, [name]: value }))
    if (errors[name]) setErrors(er => ({ ...er, [name]: false }))
  }

  const canNext = step === 0 ? !!data.projet : step === 1 ? !!data.budget : true

  // ---------- Envoi ----------
  const handleSubmit = async (e) => {
    e.preventDefault()
    if (status === 'sending') return

    if (step < STEPS.length - 1) {
      if (canNext) goTo(step + 1)
      return
    }

    const nextErrors = { nom: !data.nom.trim(), email: !emailOk }
    if (nextErrors.nom || nextErrors.email) {
      setErrors(nextErrors)
      setShake(n => n + 1)
      return
    }

    const ref = makeReference()
    setReference(ref)
    setStatus('sending')
    if (submitFillRef.current && !prefersReducedMotion()) {
      gsap.fromTo(submitFillRef.current, { scaleX: 0 }, { scaleX: 0.92, duration: 1.2, ease: 'power1.out' })
    }

    const body = new FormData()
    body.append('reference', ref)
    Object.entries(data).forEach(([k, v]) => body.append(k, Array.isArray(v) ? v.join(', ') : v))

    try {
      const [res] = await Promise.all([
        fetch(FORMSPREE_URL, { method: 'POST', body, headers: { 'Accept': 'application/json' } }),
        new Promise(r => setTimeout(r, prefersReducedMotion() ? 0 : 1250)),
      ])
      if (!res.ok) throw new Error('envoi')
      if (submitFillRef.current && !prefersReducedMotion()) gsap.to(submitFillRef.current, { scaleX: 1, duration: 0.2 })
      const btn = formRef.current.querySelector('.devis-submit')
      if (btn) {
        const { x, y } = localPoint(null, btn)
        burst(x, y, { count: 90, power: 9, temp: 90, spread: 0.9 })
      }
      setTimeout(() => setStatus('sent'), prefersReducedMotion() ? 0 : 220)
    } catch {
      setStatus('error')
      if (submitFillRef.current) gsap.to(submitFillRef.current, { scaleX: 0, duration: 0.3 })
      setTimeout(() => setStatus('idle'), 3500)
    }
  }

  const restart = () => {
    setData(EMPTY)
    setErrors({})
    setStatus('idle')
    dirRef.current = -1
    setStep(0)
  }

  const current = STEPS[step]
  const sent = status === 'sent'
  const brief = Math.min(1, (data.message.trim().length + data.fonctions.length * 40) / 260)

  return (
    <section id="contact">
      <div className="section-head reveal">
        <div>
          <span className="section-label">
            <b>02</b><span className="sep">//</span> DEVIS GRATUIT
          </span>
          <h2 className="section-title">Votre devis <em>en 1 minute</em>.</h2>
          <p className="section-intro">
            4 questions, et je vous réponds sous 48h avec une proposition claire :
            ce qui est prévu, le délai et le prix. Gratuit et sans engagement.
          </p>
        </div>
        <div className="section-temp">
          18<span className="deg">°</span>
          <span className="label">PRÊT À DÉMARRER</span>
        </div>
      </div>

      <div className="contact reveal">
        <div className="contact-grid">
          <div className="contact-info">
            <span className="section-label">
              <b>02</b><span className="sep">//</span> ME CONTACTER
            </span>
            <h2>
              Parlons de votre <em>projet</em>.
            </h2>
            <p>
              Votre devis en 4 étapes, moins d'une minute. Vous recevez une réponse
              en moins de 48 heures, écrite à la main. Vous préférez parler directement ?
            </p>
            <div className="contact-direct">
              <a href={`mailto:${EMAIL}`}>
                <span className="ch">01</span>
                <span>{EMAIL}</span>
                <span>→</span>
              </a>
              <a href={`tel:${PHONE}`}>
                <span className="ch">02</span>
                <span>{PHONE}</span>
                <span>→</span>
              </a>
              <a href={`https://wa.me/${PHONE_INTL}`} target="_blank" rel="noopener noreferrer">
                <span className="ch">03</span>
                <span>WHATSAPP</span>
                <span>→</span>
              </a>
            </div>
          </div>

          <form className={`devis devis--${status}`} ref={formRef} onSubmit={handleSubmit} noValidate>
            <canvas className="devis-sparks" ref={canvasRef} aria-hidden="true" />
            <div className="devis-glow" aria-hidden="true" />

            <Thermostat readoutRef={readoutRef} labelRef={labelRef} step={step} sent={sent} goTo={goTo} />

            {sent ? (
              <Ticket data={data} reference={reference} onRestart={restart} />
            ) : (
              <div key={step} ref={panelRef} className="devis-panel">
                <span className="devis-count" data-anim>ÉTAPE {step + 1} / {STEPS.length}{data.formule && ` · FORMULE ${data.formule.toUpperCase()}`}</span>
                <h3 className="devis-title" data-anim><Scramble text={current.title} /></h3>

                {step === 0 && (
                  <fieldset className="devis-options">
                    <legend className="sr-only">{current.title}</legend>
                    {PROJETS.map(p => (
                      <label
                        key={p.value}
                        className={`devis-option${data.projet === p.value ? ' is-on' : ''}`}
                        data-anim
                        onPointerMove={tilt}
                        onPointerLeave={untilt}
                        onPointerDown={e => { lastPointer.current = { clientX: e.clientX, clientY: e.clientY } }}
                      >
                        <input
                          type="radio"
                          name="projet"
                          value={p.value}
                          checked={data.projet === p.value}
                          onChange={e => pick('projet', p.value, e.target.closest('.devis-option'))}
                        />
                        <span className="devis-icon"><Icon name={p.icon} /></span>
                        <span className="devis-text">
                          <b>{p.value}</b>
                          <small>{p.hint}</small>
                        </span>
                        <span className="devis-tick" aria-hidden="true">✓</span>
                      </label>
                    ))}
                  </fieldset>
                )}

                {step === 1 && (
                  <fieldset className="devis-options">
                    <legend className="sr-only">{current.title}</legend>
                    {BUDGETS.map(b => (
                      <label
                        key={b.value}
                        className={`devis-option compact${data.budget === b.value ? ' is-on' : ''}`}
                        data-anim
                        onPointerMove={tilt}
                        onPointerLeave={untilt}
                        onPointerDown={e => { lastPointer.current = { clientX: e.clientX, clientY: e.clientY } }}
                      >
                        <input
                          type="radio"
                          name="budget"
                          value={b.value}
                          checked={data.budget === b.value}
                          onChange={e => pick('budget', b.value, e.target.closest('.devis-option'))}
                        />
                        <Gauge level={b.level} />
                        <span className="devis-text"><b>{b.value}</b></span>
                        <span className="devis-tick" aria-hidden="true">✓</span>
                      </label>
                    ))}
                  </fieldset>
                )}

                {step === 2 && (
                  <>
                    <div className="devis-chips" data-anim role="group" aria-label="Fonctions souhaitées">
                      {FONCTIONS.map(f => {
                        const on = data.fonctions.includes(f)
                        return (
                          <button key={f} type="button" className={`devis-fn${on ? ' is-on' : ''}`} aria-pressed={on} onClick={e => toggleFonction(f, e)}>
                            <span aria-hidden="true">{on ? '✓' : '+'}</span>{f}
                          </button>
                        )
                      })}
                    </div>
                    <div className="field" data-anim>
                      <label htmlFor="message"><span>VOTRE PROJET</span><span className="ch">FACULTATIF</span></label>
                      <textarea
                        id="message"
                        name="message"
                        rows={4}
                        value={data.message}
                        onChange={update}
                        placeholder="Ex : un site pour ma boulangerie, avec les horaires, la carte et un plan d'accès."
                      />
                    </div>
                    <div className="devis-brief" data-anim style={{ '--b': brief }}>
                      <span>PRÉCISION DU BRIEF</span>
                      <div className="devis-brief-bar"><i /></div>
                      <b>{brief < 0.34 ? 'TIÈDE' : brief < 0.75 ? 'CHAUD' : 'PARFAIT'}</b>
                    </div>
                  </>
                )}

                {step === 3 && (
                  <>
                    <div className={`field${errors.nom ? ' invalid' : ''}`} data-anim>
                      <label htmlFor="nom"><span>NOM</span><span className="ch">REQUIS</span></label>
                      <div className="devis-input">
                        <input type="text" id="nom" name="nom" autoComplete="name" value={data.nom} onChange={update} aria-invalid={!!errors.nom} />
                        {data.nom.trim() && <span className="devis-ok" aria-hidden="true">✓</span>}
                      </div>
                      {errors.nom && <span className="devis-error">Indiquez votre nom.</span>}
                    </div>
                    <div className={`field${errors.email ? ' invalid' : ''}`} data-anim>
                      <label htmlFor="email"><span>EMAIL</span><span className="ch">REQUIS</span></label>
                      <div className="devis-input">
                        <input type="email" id="email" name="email" autoComplete="email" value={data.email} onChange={update} aria-invalid={!!errors.email} />
                        {emailOk && <span className="devis-ok" aria-hidden="true">✓</span>}
                      </div>
                      {errors.email && <span className="devis-error">Cette adresse email ne semble pas valide.</span>}
                    </div>
                  </>
                )}

                {(data.projet || data.budget) && (
                  <div className="devis-recap" aria-label="Récapitulatif" data-anim>
                    {data.projet && (
                      <button type="button" className="devis-chip" onClick={() => goTo(0)} title="Modifier">
                        <span>PROJET</span>{data.projet}
                      </button>
                    )}
                    {data.budget && (
                      <button type="button" className="devis-chip" onClick={() => goTo(1)} title="Modifier">
                        <span>BUDGET</span>{data.budget}
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}

            {!sent && (
              <div className="devis-nav">
                {step > 0 ? (
                  <button type="button" className="btn btn-ghost" onClick={() => goTo(step - 1)} disabled={status === 'sending'}>
                    <span className="arrow back">←</span> Retour
                  </button>
                ) : <span />}

                {step < STEPS.length - 1 ? (
                  <button type="submit" className="btn btn-primary" disabled={!canNext}>
                    Suivant <span className="arrow">→</span>
                  </button>
                ) : (
                  <button type="submit" className={`btn btn-primary devis-submit${status === 'error' ? ' is-error' : ''}`} disabled={status === 'sending'}>
                    <span className="devis-submit-fill" ref={submitFillRef} aria-hidden="true" />
                    <span className="devis-submit-txt">
                      {status === 'error' ? 'Échec — réessayez' :
                       status === 'sending' ? 'Envoi en cours…' :
                       <>Recevoir mon devis <span className="arrow">→</span></>}
                    </span>
                  </button>
                )}
              </div>
            )}
          </form>
        </div>
      </div>
    </section>
  )
}
