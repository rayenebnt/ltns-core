import { useEffect, useRef, useState } from 'react'

const EMAIL = 'ltnscore@gmail.com'
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

const STEPS = [
  { key: 'projet', label: 'Projet', title: 'Quel est votre projet ?' },
  { key: 'budget', label: 'Budget', title: 'Quel budget envisagez-vous ?' },
  { key: 'message', label: 'Détails', title: 'Dites-m\'en un peu plus' },
  { key: 'coords', label: 'Contact', title: 'Où vous envoyer le devis ?' },
]

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

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
      {[1, 2, 3, 4].map(i => <i key={i} className={level >= i ? 'on' : ''} />)}
    </span>
  )
}

const EMPTY = { projet: '', budget: '', message: '', nom: '', email: '' }

export default function Contact() {
  const [step, setStep] = useState(0)
  const [dir, setDir] = useState(1)
  const [data, setData] = useState(EMPTY)
  const [errors, setErrors] = useState({})
  const [status, setStatus] = useState('idle')
  const panelRef = useRef(null)
  const advanceTimer = useRef(null)

  useEffect(() => () => clearTimeout(advanceTimer.current), [])

  // Met le focus sur le premier champ de l'étape (sans faire sauter la page)
  useEffect(() => {
    if (step < 2) return
    const el = panelRef.current?.querySelector('input, textarea')
    el?.focus({ preventScroll: true })
  }, [step])

  const goTo = (next) => {
    clearTimeout(advanceTimer.current)
    setDir(next > step ? 1 : -1)
    setStep(next)
  }

  const pick = (key, value) => {
    setData(d => ({ ...d, [key]: value }))
    // Avance automatiquement après un court instant pour laisser voir la sélection
    clearTimeout(advanceTimer.current)
    advanceTimer.current = setTimeout(() => {
      setDir(1)
      setStep(s => Math.min(s + 1, STEPS.length - 1))
    }, 380)
  }

  const update = (e) => {
    const { name, value } = e.target
    setData(d => ({ ...d, [name]: value }))
    if (errors[name]) setErrors(er => ({ ...er, [name]: false }))
  }

  const canNext = step === 0 ? !!data.projet : step === 1 ? !!data.budget : true

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (step < STEPS.length - 1) {
      if (canNext) goTo(step + 1)
      return
    }

    const nextErrors = {
      nom: !data.nom.trim(),
      email: !EMAIL_RE.test(data.email.trim()),
    }
    if (nextErrors.nom || nextErrors.email) {
      setErrors(nextErrors)
      return
    }

    setStatus('sending')
    const body = new FormData()
    Object.entries(data).forEach(([k, v]) => body.append(k, v))

    try {
      const res = await fetch('https://formspree.io/f/mvzlnbop', {
        method: 'POST',
        body,
        headers: { 'Accept': 'application/json' }
      })
      if (res.ok) {
        setStatus('sent')
      } else {
        setStatus('error')
        setTimeout(() => setStatus('idle'), 4000)
      }
    } catch {
      setStatus('error')
      setTimeout(() => setStatus('idle'), 4000)
    }
  }

  const restart = () => {
    setData(EMPTY)
    setErrors({})
    setStatus('idle')
    setDir(-1)
    setStep(0)
  }

  const progress = status === 'sent' ? 1 : step / (STEPS.length - 1)
  const current = STEPS[step]

  return (
    <section id="contact">
      <div className="section-head reveal">
        <div>
          <span className="section-label">
            <b>01</b><span className="sep">//</span> CONTACT
          </span>
          <h2 className="section-title">Au <em>contact</em>.</h2>
          <p className="section-intro">
            Un devis gratuit sous 48h, sans engagement. On parle d'abord de votre projet,
            on parle du prix ensuite.
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
              <b>01</b><span className="sep">//</span> ME CONTACTER
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

          <form className="devis" onSubmit={handleSubmit} noValidate>
            {/* Progression : une jauge qui chauffe à chaque étape */}
            <ol className="devis-steps" style={{ '--p': progress }}>
              {STEPS.map((s, i) => {
                const done = status === 'sent' || i < step
                const reachable = status !== 'sent' && i < step
                return (
                  <li key={s.key} className={`${done ? 'done' : ''} ${i === step && status !== 'sent' ? 'active' : ''}`}>
                    <button
                      type="button"
                      onClick={() => reachable && goTo(i)}
                      disabled={!reachable}
                      aria-current={i === step ? 'step' : undefined}
                    >
                      <span className="dot">{done ? '✓' : i + 1}</span>
                      <span className="lbl">{s.label}</span>
                    </button>
                  </li>
                )
              })}
            </ol>

            {status === 'sent' ? (
              <div className="devis-panel devis-success" role="status">
                <svg className="devis-check" viewBox="0 0 64 64" aria-hidden="true">
                  <circle cx="32" cy="32" r="29" />
                  <path d="M19 33l9 9 17-19" />
                </svg>
                <h3>Demande envoyée !</h3>
                <p>
                  Merci {data.nom.trim().split(' ')[0]}. Je reviens vers vous sous 48h
                  à <b>{data.email}</b> avec un devis détaillé.
                </p>
                <button type="button" className="btn btn-ghost" onClick={restart}>
                  Nouvelle demande <span className="arrow">↺</span>
                </button>
              </div>
            ) : (
              <div
                key={step}
                ref={panelRef}
                className={`devis-panel ${dir > 0 ? 'from-right' : 'from-left'}`}
              >
                <span className="devis-count">ÉTAPE {step + 1} / {STEPS.length}</span>
                <h3 className="devis-title">{current.title}</h3>

                {step === 0 && (
                  <fieldset className="devis-options">
                    <legend className="sr-only">{current.title}</legend>
                    {PROJETS.map((p, i) => (
                      <label key={p.value} className="devis-option" style={{ '--i': i }}>
                        <input
                          type="radio"
                          name="projet"
                          value={p.value}
                          checked={data.projet === p.value}
                          onChange={() => pick('projet', p.value)}
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
                    {BUDGETS.map((b, i) => (
                      <label key={b.value} className="devis-option compact" style={{ '--i': i }}>
                        <input
                          type="radio"
                          name="budget"
                          value={b.value}
                          checked={data.budget === b.value}
                          onChange={() => pick('budget', b.value)}
                        />
                        <Gauge level={b.level} />
                        <span className="devis-text"><b>{b.value}</b></span>
                        <span className="devis-tick" aria-hidden="true">✓</span>
                      </label>
                    ))}
                  </fieldset>
                )}

                {step === 2 && (
                  <div className="field devis-rise">
                    <label htmlFor="message"><span>VOTRE PROJET</span><span className="ch">FACULTATIF</span></label>
                    <textarea
                      id="message"
                      name="message"
                      rows={5}
                      value={data.message}
                      onChange={update}
                      placeholder="Ex : un site pour ma boulangerie, avec les horaires, la carte et un plan d'accès."
                    />
                  </div>
                )}

                {step === 3 && (
                  <>
                    <div className={`field devis-rise ${errors.nom ? 'invalid' : ''}`} style={{ '--i': 0 }}>
                      <label htmlFor="nom"><span>NOM</span><span className="ch">REQUIS</span></label>
                      <input type="text" id="nom" name="nom" autoComplete="name" value={data.nom} onChange={update} aria-invalid={!!errors.nom} />
                      {errors.nom && <span className="devis-error">Indiquez votre nom.</span>}
                    </div>
                    <div className={`field devis-rise ${errors.email ? 'invalid' : ''}`} style={{ '--i': 1 }}>
                      <label htmlFor="email"><span>EMAIL</span><span className="ch">REQUIS</span></label>
                      <input type="email" id="email" name="email" autoComplete="email" value={data.email} onChange={update} aria-invalid={!!errors.email} />
                      {errors.email && <span className="devis-error">Cette adresse email ne semble pas valide.</span>}
                    </div>
                  </>
                )}

                {/* Récapitulatif des choix déjà faits */}
                {(data.projet || data.budget) && (
                  <div className="devis-recap" aria-label="Récapitulatif">
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

            {status !== 'sent' && (
              <div className="devis-nav">
                {step > 0 ? (
                  <button type="button" className="btn btn-ghost" onClick={() => goTo(step - 1)}>
                    <span className="arrow back">←</span> Retour
                  </button>
                ) : <span />}

                <button
                  type="submit"
                  className={`btn btn-primary ${status === 'error' ? 'is-error' : ''} ${status === 'sending' ? 'is-sending' : ''}`}
                  disabled={!canNext || status === 'sending'}
                >
                  {step < STEPS.length - 1 ? <>Suivant <span className="arrow">→</span></> :
                   status === 'error'   ? 'Échec — réessayez' :
                   status === 'sending' ? <>Envoi en cours <span className="devis-spinner" aria-hidden="true" /></> :
                   <>Recevoir mon devis <span className="arrow">→</span></>}
                </button>
              </div>
            )}
          </form>
        </div>
      </div>
    </section>
  )
}
