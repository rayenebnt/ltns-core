import { useEffect, useRef, useState } from 'react'
import { PROJECT_OPTIONS, PROJECT_TYPES, QUOTE_EVENT } from '../data/projects'

const EMAIL = 'ltnscore@gmail.com'
const PHONE = '06 25 20 64 93'
const PHONE_INTL = '+33625206493'

const BUDGETS = [
  'Moins de 500€',
  '500 — 1 000€',
  '1 000 — 3 000€',
  '3 000€ et +',
  'Je ne sais pas encore',
]

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

function validate(values) {
  const errors = {}
  if (!values.nom.trim()) errors.nom = 'Indiquez votre nom pour qu’on sache à qui répondre.'
  if (!values.email.trim()) errors.email = 'Un email est nécessaire pour vous envoyer le devis.'
  else if (!EMAIL_RE.test(values.email.trim())) errors.email = 'Cet email semble incomplet — vérifiez la saisie.'
  if (values.message.trim().length < 10) errors.message = 'Décrivez votre projet en une phrase au minimum.'
  return errors
}

const EMPTY = {
  nom: '',
  email: '',
  telephone: '',
  projet: PROJECT_TYPES.VITRINE,
  budget: BUDGETS[BUDGETS.length - 1],
  message: '',
}

export default function Contact() {
  const [status, setStatus] = useState('idle')
  const [values, setValues] = useState(EMPTY)
  const [errors, setErrors] = useState({})
  const [submitted, setSubmitted] = useState(false)
  const projetRef = useRef(null)
  const formRef = useRef(null)

  const set = (name) => (e) => {
    const value = e.target.value
    setValues((v) => {
      const next = { ...v, [name]: value }
      // On ne corrige les messages d'erreur qu'après une première tentative :
      // pas de reproche pendant que l'utilisateur est encore en train d'écrire.
      if (submitted) setErrors(validate(next))
      return next
    })
  }

  // Une gamme ou une formule cliquée ailleurs sur la page pré-remplit le type
  // de projet, et le champ se signale pour que le changement soit visible.
  useEffect(() => {
    const onQuote = (e) => {
      const projet = e.detail
      if (!PROJECT_OPTIONS.includes(projet)) return
      setValues((v) => ({ ...v, projet }))
      window.setTimeout(() => {
        const el = projetRef.current
        if (!el) return
        el.classList.add('prefilled')
        window.setTimeout(() => el.classList.remove('prefilled'), 1600)
      }, 500)
    }
    window.addEventListener(QUOTE_EVENT, onQuote)
    return () => window.removeEventListener(QUOTE_EVENT, onQuote)
  }, [])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSubmitted(true)

    const found = validate(values)
    setErrors(found)
    if (Object.keys(found).length) {
      // On emmène l'utilisateur sur le premier champ fautif plutôt que
      // de le laisser chercher ce qui bloque.
      const first = formRef.current?.querySelector('[aria-invalid="true"]')
      first?.focus()
      setStatus('invalid')
      return
    }

    setStatus('sending')

    try {
      const res = await fetch('https://formspree.io/f/mvzlnbop', {
        method: 'POST',
        body: new FormData(e.target),
        headers: { 'Accept': 'application/json' }
      })

      if (res.ok) {
        setStatus('sent')
        setValues(EMPTY)
        setSubmitted(false)
        setErrors({})
      } else {
        setStatus('error')
      }
    } catch {
      setStatus('error')
    }
  }

  const invalid = (name) => (errors[name] ? 'true' : undefined)
  const describedBy = (name) => (errors[name] ? `${name}-error` : undefined)

  return (
    <section id="contact">
      <div className="section-head reveal">
        <div>
          <span className="section-label">
            <b>06</b><span className="sep">//</span> CONTACT
          </span>
          <h2 className="section-title">Au <em>contact</em>.</h2>
          <p className="section-intro">
            Devis gratuit sous 48h. Sans engagement. On échange d'abord, on chiffre ensuite.
          </p>
        </div>
        <div className="section-temp">
          99<span className="deg">°</span>
          <span className="label">RÉGIME · MAX</span>
        </div>
      </div>

      <div className="contact reveal">
        <div className="contact-grid">
          <div className="contact-info">
            <span className="section-label">
              <b>CH·01</b><span className="sep">//</span> LIGNE DIRECTE
            </span>
            <h2>
              Parlons de votre <em>projet</em>.
            </h2>
            <p>
              Trois canaux ouverts en permanence. Le plus rapide reste le formulaire :
              vous recevez une réponse motivée en moins de 48 heures.
            </p>
            <div className="contact-direct">
              <a href={`mailto:${EMAIL}`}>
                <span className="ch">CH·01</span>
                <span>{EMAIL}</span>
                <span aria-hidden="true">→</span>
              </a>
              <a href={`tel:${PHONE_INTL}`}>
                <span className="ch">CH·02</span>
                <span>{PHONE}</span>
                <span aria-hidden="true">→</span>
              </a>
              <a href={`https://wa.me/${PHONE_INTL.replace('+', '')}`} target="_blank" rel="noopener noreferrer">
                <span className="ch">CH·03</span>
                <span>WhatsApp direct</span>
                <span aria-hidden="true">↗</span>
              </a>
            </div>
          </div>

          <form onSubmit={handleSubmit} ref={formRef} noValidate>
            <div className="field">
              <label htmlFor="nom"><span>Nom</span><span className="ch">Requis</span></label>
              <input
                type="text" id="nom" name="nom" autoComplete="name"
                value={values.nom} onChange={set('nom')}
                aria-invalid={invalid('nom')} aria-describedby={describedBy('nom')}
              />
              {errors.nom && <p className="field-error" id="nom-error">{errors.nom}</p>}
            </div>

            <div className="field">
              <label htmlFor="email"><span>Email</span><span className="ch">Requis</span></label>
              <input
                type="email" id="email" name="email" autoComplete="email" inputMode="email"
                value={values.email} onChange={set('email')}
                aria-invalid={invalid('email')} aria-describedby={describedBy('email')}
              />
              {errors.email && <p className="field-error" id="email-error">{errors.email}</p>}
            </div>

            <div className="field">
              <label htmlFor="telephone"><span>Téléphone</span><span className="ch">Facultatif</span></label>
              <input
                type="tel" id="telephone" name="telephone" autoComplete="tel" inputMode="tel"
                value={values.telephone} onChange={set('telephone')}
              />
            </div>

            <div className="field">
              <label htmlFor="projet"><span>Type de projet</span><span className="ch">→</span></label>
              <select
                id="projet" name="projet" ref={projetRef}
                value={values.projet} onChange={set('projet')}
              >
                {PROJECT_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
              </select>
            </div>

            <div className="field">
              <label htmlFor="budget"><span>Budget estimé</span><span className="ch">→</span></label>
              <select id="budget" name="budget" value={values.budget} onChange={set('budget')}>
                {BUDGETS.map((o) => <option key={o} value={o}>{o}</option>)}
              </select>
            </div>

            <div className="field">
              <label htmlFor="message"><span>Votre projet</span><span className="ch">Requis</span></label>
              <textarea
                id="message" name="message" placeholder="Ce que vous voulez faire, pour qui, et pour quand."
                value={values.message} onChange={set('message')}
                aria-invalid={invalid('message')} aria-describedby={describedBy('message')}
              ></textarea>
              {errors.message && <p className="field-error" id="message-error">{errors.message}</p>}
            </div>

            <button type="submit" className="btn btn-primary" disabled={status === 'sending'}>
              {status === 'sending' ? 'Transmission…' : <>Envoyer <span className="arrow">→</span></>}
            </button>

            {/* Le résultat est une vraie phrase, annoncée aux lecteurs d'écran —
                pas seulement un changement de libellé sur le bouton. */}
            <p className={`form-status ${status}`} role="status" aria-live="polite">
              {status === 'sent'    && '✓ Message transmis. Réponse sous 48 h, à l’adresse indiquée.'}
              {status === 'error'   && '✗ L’envoi a échoué. Réessayez, ou écrivez directement à ' + EMAIL + '.'}
              {status === 'invalid' && '✗ Quelques champs sont à compléter avant l’envoi.'}
            </p>
          </form>
        </div>
      </div>
    </section>
  )
}
