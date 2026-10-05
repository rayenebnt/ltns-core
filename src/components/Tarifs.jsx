import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { tempColor } from '../hooks/useThermal'
import { EMAIL, EMAIL_RE, FORMSPREE_URL, makeReference, prefillDevis } from './Contact'

gsap.registerPlugin(ScrollTrigger)

// Formules affichées — prix, contenu et délais modifiables ici.
// price: null → « sur devis » : le bouton mène au devis détaillé.
// Sinon le bouton ouvre une demande directe (nom, email, téléphone).
const FORMULES = [
  {
    id: '01', name: 'Essentiel', temp: 38, heat: 'TIÈDE',
    pitch: 'Pour être présent sur internet, simplement.',
    price: 490,
    pour: 'Artisans, indépendants',
    delai: '≈ 2 semaines',
    features: [
      "Un site d'une seule page",
      'Lisible sur ordinateur et téléphone',
      'Design créé pour vous',
      'Formulaire de contact',
      'Les bases pour être trouvé sur Google',
      '1ʳᵉ année en ligne offerte',
    ],
  },
  {
    id: '02', name: 'Pro', temp: 66, heat: 'CHAUD', featured: true,
    pitch: 'Un site complet qui travaille pour vous.',
    price: 990,
    pour: 'Entreprises, associations',
    delai: '2 à 4 semaines',
    features: [
      "Jusqu'à 6 pages",
      'Design soigné, simple à utiliser',
      'Animations créées pour vous',
      'Un espace pour modifier vos textes',
      'Mieux placé sur Google + suivi des visites',
      '1ʳᵉ année en ligne offerte',
    ],
  },
  {
    id: '03', name: 'Sur-mesure', temp: 99, heat: 'BRÛLANT',
    pitch: 'Boutique, logiciel ou application : on construit votre outil.',
    price: null,
    pour: 'Projets plus ambitieux',
    delai: 'Fixé dans le devis',
    features: [
      'Boutique en ligne ou espace client',
      'Logiciel ou application mobile',
      'Des fonctions rien que pour vous',
      'Connexion avec vos autres outils',
      'Suivi et mises à jour dans la durée',
    ],
  },
]

// Ce que toutes les formules ont en commun
const INCLUS = [
  'Devis gratuit sous 48h',
  "Prix fixé avant de commencer",
  'Un seul interlocuteur',
  'Tout vous appartient',
]

const SEGMENTS = 12
const pos = temp => (temp - 12) / 87 // 12° → 0, 99° → 1
const rgb = t => { const c = tempColor(t); return `${c.r}, ${c.g}, ${c.b}` }
const fmtPrice = v => Math.round(v).toLocaleString('fr-FR')
const priceLabel = f => `à partir de ${fmtPrice(f.price)} € TTC`

// Couleur thermique propre à une formule, posée en variables CSS
const heatVars = temp => {
  const heat = rgb(pos(temp))
  return {
    '--accent': `rgb(${heat})`,
    '--accent-rgb': heat,
    '--accent-soft': `rgba(${heat}, 0.12)`,
    '--accent-glow': `rgba(${heat}, 0.45)`,
    '--accent-line': `rgba(${heat}, 0.35)`,
  }
}

const prefersReducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches

function TarifCard({ f, onChoose }) {
  const lit = Math.max(1, Math.round(pos(f.temp) * SEGMENTS))

  const onPointerMove = (e) => {
    if (e.pointerType !== 'mouse') return
    const el = e.currentTarget, r = el.getBoundingClientRect()
    el.style.setProperty('--mx', `${e.clientX - r.left}px`)
    el.style.setProperty('--my', `${e.clientY - r.top}px`)
  }

  const btnClass = `btn ${f.featured ? 'btn-primary' : 'btn-ghost'}`

  return (
    <div className="tf-cell">
      <article className={`tf${f.featured ? ' tf--featured' : ''}`} style={heatVars(f.temp)} onPointerMove={onPointerMove}>
        {f.featured && <span className="tf-ring" aria-hidden="true" />}
        <div className="tf-inner">
          <div className="tf-head">
            <span>FORMULE {f.id} · {f.heat}</span>
            {f.featured && <span className="tf-badge">LE PLUS CHOISI</span>}
          </div>

          <div className="tf-title">
            <h3>{f.name}</h3>
            <span className="tf-temp" aria-hidden="true">
              <b data-count={f.temp} data-from="12">{f.temp}</b><i>°</i>
            </span>
          </div>
          <p className="tf-pitch">{f.pitch}</p>

          <div className="tf-gauge" aria-hidden="true">
            {Array.from({ length: SEGMENTS }, (_, i) => (
              <i key={i} className={i < lit ? 'on' : ''} style={{ '--seg': `rgb(${rgb(i / (SEGMENTS - 1))})`, '--k': i }} />
            ))}
          </div>

          <div className="tf-price">
            {f.price ? (
              <>
                <small>à partir de</small>
                <strong><b data-count={f.price} data-from="0">{fmtPrice(f.price)}</b>&nbsp;€</strong>
                <small>TTC</small>
              </>
            ) : (
              <>
                <small>prix selon le projet</small>
                <strong className="tf-quote">Sur devis</strong>
                <small>gratuit</small>
              </>
            )}
          </div>

          <dl className="tf-meta">
            <div><dt>Idéal pour</dt><dd>{f.pour}</dd></div>
            <div><dt>Délai</dt><dd>{f.delai}</dd></div>
          </dl>

          <ul className="tf-list">
            {f.features.map(x => <li key={x}>{x}</li>)}
          </ul>

          {f.price ? (
            <button type="button" className={btnClass} onClick={e => onChoose(f, e)}>
              Choisir {f.name} <span className="arrow">→</span>
            </button>
          ) : (
            <a href="#contact" className={btnClass} onClick={() => prefillDevis(null, { formule: f.name })}>
              Parlons de mon projet <span className="arrow">→</span>
            </a>
          )}
        </div>
      </article>
    </div>
  )
}

/* Demande directe : la formule est choisie, il ne reste qu'à laisser ses coordonnées */
const EMPTY = { nom: '', email: '', telephone: '', message: '' }

function FormuleDialog({ f, origin, onClose }) {
  const [data, setData] = useState(EMPTY)
  const [errors, setErrors] = useState({})
  const [status, setStatus] = useState('idle')
  const [reference, setReference] = useState('')

  const rootRef = useRef(null)
  const panelRef = useRef(null)
  const readRef = useRef(null)
  const heat = useRef({ t: 12 })
  const closing = useRef(false)

  const sent = status === 'sent'

  // Lecture et jauge du thermomètre
  const paint = () => {
    const t = heat.current.t
    panelRef.current?.style.setProperty('--fq-p', pos(t).toFixed(4))
    if (readRef.current) readRef.current.textContent = t.toFixed(1)
  }

  // Ouverture : la fenêtre se propage depuis le bouton cliqué
  useLayoutEffect(() => {
    const panel = panelRef.current
    const r = panel.getBoundingClientRect()
    const cx = origin.x - r.left, cy = origin.y - r.top
    const radius = Math.hypot(Math.max(cx, r.width - cx), Math.max(cy, r.height - cy))
    panel.style.setProperty('--cx', `${cx}px`)
    panel.style.setProperty('--cy', `${cy}px`)
    panel.dataset.radius = radius

    if (prefersReducedMotion()) {
      heat.current.t = f.temp
      paint()
      return
    }
    paint()
    const ctx = gsap.context(() => {
      gsap.timeline()
        .fromTo('.fq-backdrop', { opacity: 0 }, { opacity: 1, duration: 0.35 }, 0)
        .fromTo(panel, { clipPath: `circle(0px at ${cx}px ${cy}px)` }, { clipPath: `circle(${radius}px at ${cx}px ${cy}px)`, duration: 0.75, ease: 'power3.inOut', clearProps: 'clipPath' }, 0)
        .fromTo('[data-fq]', { y: 22, opacity: 0 }, { y: 0, opacity: 1, duration: 0.5, stagger: 0.05, ease: 'power3.out', clearProps: 'transform,opacity' }, 0.35)
        .to(heat.current, { t: f.temp, duration: 1, ease: 'power2.out', onUpdate: paint }, 0.4)
    }, rootRef)
    return () => ctx.revert()
  }, [])

  // Envoi en cours puis reçu : le thermomètre monte à 99°
  useEffect(() => {
    if (status !== 'sending' && status !== 'sent') return
    if (prefersReducedMotion()) { heat.current.t = 99; paint(); return }
    const tw = gsap.to(heat.current, { t: status === 'sent' ? 99 : 92, duration: status === 'sent' ? 0.4 : 1.2, ease: 'power2.out', onUpdate: paint })
    return () => tw.kill()
  }, [status])

  // Animation du reçu
  useLayoutEffect(() => {
    if (!sent || prefersReducedMotion()) return
    const ctx = gsap.context(() => {
      gsap.timeline()
        .fromTo('.fq-check circle', { strokeDashoffset: 160 }, { strokeDashoffset: 0, duration: 0.6, ease: 'power2.out' })
        .fromTo('.fq-check path', { strokeDashoffset: 40 }, { strokeDashoffset: 0, duration: 0.35, ease: 'power2.out' }, 0.45)
        .fromTo('.fq-stamp', { scale: 2.6, opacity: 0, rotate: -24 }, { scale: 1, opacity: 1, rotate: -8, duration: 0.35, ease: 'power4.in' }, 0.6)
        .fromTo('[data-fq-done]', { y: 14, opacity: 0 }, { y: 0, opacity: 1, duration: 0.45, stagger: 0.07, clearProps: 'transform,opacity' }, 0.8)
    }, panelRef)
    return () => ctx.revert()
  }, [sent])

  const close = () => {
    if (closing.current) return
    const panel = panelRef.current
    if (!panel || prefersReducedMotion()) { onClose(); return }
    closing.current = true
    const { radius } = panel.dataset
    const cx = panel.style.getPropertyValue('--cx'), cy = panel.style.getPropertyValue('--cy')
    gsap.timeline({ onComplete: onClose })
      .fromTo(panel, { clipPath: `circle(${radius}px at ${cx} ${cy})` }, { clipPath: `circle(0px at ${cx} ${cy})`, duration: 0.5, ease: 'power3.in' }, 0)
      .to(rootRef.current.querySelector('.fq-backdrop'), { opacity: 0, duration: 0.3 }, 0.2)
  }

  // Échap pour fermer, page figée derrière, focus sur le premier champ
  useEffect(() => {
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKey = e => { if (e.key === 'Escape') close() }
    window.addEventListener('keydown', onKey)
    const id = setTimeout(() => panelRef.current?.querySelector('input')?.focus({ preventScroll: true }), prefersReducedMotion() ? 0 : 700)
    return () => {
      document.body.style.overflow = previous
      window.removeEventListener('keydown', onKey)
      clearTimeout(id)
    }
  }, [])

  const update = (e) => {
    const { name, value } = e.target
    setData(d => ({ ...d, [name]: value }))
    if (errors[name]) setErrors(er => ({ ...er, [name]: false }))
  }

  const submit = async (e) => {
    e.preventDefault()
    if (status === 'sending') return
    const nextErrors = { nom: !data.nom.trim(), email: !EMAIL_RE.test(data.email.trim()) }
    if (nextErrors.nom || nextErrors.email) {
      setErrors(nextErrors)
      if (!prefersReducedMotion()) {
        gsap.fromTo(panelRef.current.querySelectorAll('.field.invalid'), { x: 0 }, { x: 8, duration: 0.06, repeat: 5, yoyo: true, clearProps: 'x' })
      }
      return
    }

    const ref = makeReference()
    setReference(ref)
    setStatus('sending')

    const body = new FormData()
    body.append('_subject', `Formule ${f.name} — ${data.nom.trim()}`)
    body.append('type', 'Demande de formule')
    body.append('formule', f.name)
    body.append('prix', priceLabel(f))
    body.append('reference', ref)
    Object.entries(data).forEach(([k, v]) => body.append(k, v.trim()))

    try {
      const [res] = await Promise.all([
        fetch(FORMSPREE_URL, { method: 'POST', body, headers: { 'Accept': 'application/json' } }),
        new Promise(r => setTimeout(r, prefersReducedMotion() ? 0 : 1100)),
      ])
      if (!res.ok) throw new Error('envoi')
      setStatus('sent')
    } catch {
      setStatus('error')
    }
  }

  const first = data.nom.trim().split(' ')[0]

  return createPortal(
    <div className="fq" ref={rootRef} style={heatVars(f.temp)}>
      <div className="fq-backdrop" onClick={close} />
      <div
        className={`fq-panel fq--${status}`}
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="fq-title"
      >
        <button type="button" className="fq-close" onClick={close}>
          FERMER <span aria-hidden="true">✕</span>
        </button>

        <div className="fq-thermo" data-fq aria-hidden="true">
          <div className="fq-thermo-read">
            <span>FORMULE {f.id} · {f.name.toUpperCase()}</span>
            <b><span ref={readRef}>12.0</span>°</b>
          </div>
          <div className="fq-thermo-track"><i /></div>
        </div>

        {sent ? (
          <div className="fq-done" role="status">
            <svg className="fq-check" viewBox="0 0 56 56" aria-hidden="true">
              <circle cx="28" cy="28" r="25" />
              <path d="M17 29l7 7 15-16" />
            </svg>
            <span className="fq-stamp" aria-hidden="true">REÇU ✓</span>
            <h3 id="fq-title" data-fq-done>Merci {first}&nbsp;!</h3>
            <p data-fq-done>
              Votre demande pour la formule <b>{f.name}</b> est bien arrivée. Je vous recontacte
              sous 48h à <b>{data.email.trim()}</b>{data.telephone.trim() && <> ou au <b>{data.telephone.trim()}</b></>}.
            </p>
            <span className="fq-ref" data-fq-done>RÉF. {reference}</span>
            <button type="button" className="btn btn-ghost" data-fq-done onClick={close}>
              Fermer <span className="arrow">→</span>
            </button>
          </div>
        ) : (
          <form className="fq-form" onSubmit={submit} noValidate>
            <h3 id="fq-title" data-fq>Formule <em>{f.name}</em>, c'est noté.</h3>
            <p className="fq-sub" data-fq>
              {priceLabel(f)} · {f.delai}. Laissez vos coordonnées, je vous rappelle
              sous 48h pour caler les détails. Sans engagement.
            </p>

            <div className="fq-grid">
              <div className={`field${errors.nom ? ' invalid' : ''}`} data-fq>
                <label htmlFor="fq-nom"><span>Prénom et nom</span><span className="ch">REQUIS</span></label>
                <input id="fq-nom" name="nom" type="text" autoComplete="name" value={data.nom} onChange={update} placeholder="Marie Dupont" />
              </div>
              <div className={`field${errors.email ? ' invalid' : ''}`} data-fq>
                <label htmlFor="fq-email"><span>Email</span><span className="ch">{errors.email ? 'À VÉRIFIER' : 'REQUIS'}</span></label>
                <input id="fq-email" name="email" type="email" autoComplete="email" inputMode="email" value={data.email} onChange={update} placeholder="marie@exemple.fr" />
              </div>
              <div className="field" data-fq>
                <label htmlFor="fq-tel"><span>Téléphone</span><span className="ch">FACULTATIF</span></label>
                <input id="fq-tel" name="telephone" type="tel" autoComplete="tel" inputMode="tel" value={data.telephone} onChange={update} placeholder="06 12 34 56 78" />
              </div>
              <div className="field" data-fq>
                <label htmlFor="fq-msg"><span>Votre activité</span><span className="ch">FACULTATIF</span></label>
                <input id="fq-msg" name="message" type="text" value={data.message} onChange={update} placeholder="Ex : boulangerie à Lyon" />
              </div>
            </div>

            {status === 'error' && (
              <p className="fq-error" role="alert">
                L'envoi n'a pas fonctionné. Réessayez, ou écrivez-moi à <a href={`mailto:${EMAIL}`}>{EMAIL}</a>.
              </p>
            )}

            <button type="submit" className="btn btn-primary fq-submit" data-fq disabled={status === 'sending'}>
              {status === 'sending' ? 'Envoi en cours…' : 'Être recontacté'} <span className="arrow">→</span>
            </button>
          </form>
        )}
      </div>
    </div>,
    document.body,
  )
}

export default function Tarifs() {
  const rootRef = useRef(null)
  const [chosen, setChosen] = useState(null)
  const triggerRef = useRef(null)

  const choose = (f, e) => {
    triggerRef.current = e.currentTarget
    const r = e.currentTarget.getBoundingClientRect()
    const origin = e.clientX ? { x: e.clientX, y: e.clientY } : { x: r.left + r.width / 2, y: r.top + r.height / 2 }
    setChosen({ f, origin })
  }

  const closeDialog = () => {
    setChosen(null)
    triggerRef.current?.focus({ preventScroll: true })
  }

  // Motion design : les cartes montent, la jauge chauffe, les chiffres défilent.
  // On anime l'enveloppe .tf-cell : la carte .tf garde ses effets de survol intacts.
  useLayoutEffect(() => {
    const root = rootRef.current
    if (!root || prefersReducedMotion()) return

    const ctx = gsap.context(() => {
      const cells = gsap.utils.toArray('.tf-cell')
      const tl = gsap.timeline({
        defaults: { ease: 'power3.out' },
        scrollTrigger: { trigger: '.tf-grid', start: 'top 80%', once: true },
        onComplete: () => root.classList.add('is-live'),
      })

      tl.fromTo(cells,
        { y: 70, opacity: 0, rotateX: 14, transformPerspective: 1000 },
        { y: 0, opacity: 1, rotateX: 0, duration: 0.9, stagger: 0.14, clearProps: 'all' })

      cells.forEach((cell, k) => {
        const at = 0.25 + k * 0.14
        const segs = cell.querySelectorAll('.tf-gauge i.on')
        const heatTime = 0.12 + segs.length * 0.07

        tl.fromTo(segs,
          { scaleY: 0.2, opacity: 0.15 },
          { scaleY: 1, opacity: 1, duration: 0.25, stagger: 0.07, ease: 'back.out(3)', clearProps: 'transform,opacity' }, at)

        cell.querySelectorAll('[data-count]').forEach(el => {
          const end = +el.dataset.count
          const from = +el.dataset.from
          const o = { v: from }
          el.textContent = fmtPrice(from)
          tl.to(o, {
            v: end, duration: heatTime + 0.3, ease: 'power2.out',
            onUpdate: () => { el.textContent = fmtPrice(o.v) },
          }, at)
        })

        tl.fromTo(cell.querySelectorAll('.tf-list li'),
          { x: -14, opacity: 0 },
          { x: 0, opacity: 1, duration: 0.4, stagger: 0.05, clearProps: 'transform,opacity' }, at + 0.2)
          .fromTo(cell.querySelector('.btn'),
            { y: 12, opacity: 0 },
            { y: 0, opacity: 1, duration: 0.4, clearProps: 'transform,opacity' }, at + 0.45)
      })

      tl.fromTo('.tf-badge',
        { scale: 2.2, opacity: 0, rotate: -12 },
        { scale: 1, opacity: 1, rotate: 0, duration: 0.35, ease: 'power4.in', clearProps: 'transform,opacity' }, 0.9)
        .fromTo('.tf-quote',
          { clipPath: 'inset(0 100% 0 0)' },
          { clipPath: 'inset(0 0% 0 0)', duration: 0.6, ease: 'steps(9)', clearProps: 'clipPath' }, 0.6)

      gsap.fromTo('.tf-inclus li',
        { y: 16, opacity: 0 },
        {
          y: 0, opacity: 1, duration: 0.5, stagger: 0.08, ease: 'power3.out', clearProps: 'transform,opacity',
          scrollTrigger: { trigger: '.tf-inclus', start: 'top 90%', once: true },
        })
    }, root)

    return () => ctx.revert()
  }, [])

  return (
    <section id="tarifs" ref={rootRef}>
      <div className="section-head reveal">
        <div>
          <span className="section-label">
            <b>01</b><span className="sep">//</span> TARIFS
          </span>
          <h2 className="section-title">Trois formules,<br/><em>zéro surprise</em>.</h2>
          <p className="section-intro">
            Plus votre projet est complet, plus il chauffe. Choisissez votre formule,
            laissez vos coordonnées, je vous rappelle sous 48h.
          </p>
        </div>
        <div className="section-temp">
          66<span className="deg">°</span>
          <span className="label">DES PRIX CLAIRS</span>
        </div>
      </div>

      <div className="tf-grid">
        {FORMULES.map(f => <TarifCard key={f.id} f={f} onChoose={choose} />)}
      </div>

      <div className="tf-foot">
        <ul className="tf-inclus" aria-label="Inclus dans toutes les formules">
          {INCLUS.map(x => <li key={x}><span aria-hidden="true">✓</span>{x}</li>)}
        </ul>
        <p className="tf-help">
          Vous hésitez ? <a href="#contact">Décrivez votre projet</a>, je vous dis quelle formule vous convient.
        </p>
      </div>

      {chosen && <FormuleDialog f={chosen.f} origin={chosen.origin} onClose={closeDialog} />}
    </section>
  )
}
