import { useState } from 'react'

const EMAIL = 'rayenebentorkia@gmail.com'
const PHONE = '0625206493'
const PHONE_INTL = '+33625206493'

export default function Contact() {
  const [status, setStatus] = useState('idle')

  const handleSubmit = async (e) => {
    e.preventDefault()
    setStatus('sending')

    try {
      const res = await fetch('https://formspree.io/f/mvzlnbop', {
        method: 'POST',
        body: new FormData(e.target),
        headers: { 'Accept': 'application/json' }
      })

      if (res.ok) {
        setStatus('sent')
        e.target.reset()
        setTimeout(() => setStatus('idle'), 4000)
      } else {
        setStatus('error')
        setTimeout(() => setStatus('idle'), 4000)
      }
    } catch {
      setStatus('error')
      setTimeout(() => setStatus('idle'), 4000)
    }
  }

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
                <span>→</span>
              </a>
              <a href={`tel:${PHONE}`}>
                <span className="ch">CH·02</span>
                <span>{PHONE}</span>
                <span>→</span>
              </a>
              <a href={`https://wa.me/${PHONE_INTL}`} target="_blank" rel="noopener noreferrer">
                <span className="ch">CH·03</span>
                <span>WHATSAPP DIRECT</span>
                <span>→</span>
              </a>
            </div>
          </div>

          <form onSubmit={handleSubmit} noValidate>
            <div className="field">
              <label htmlFor="nom"><span>NOM</span><span className="ch">REQUIS</span></label>
              <input type="text" id="nom" name="nom" required />
            </div>
            <div className="field">
              <label htmlFor="email"><span>EMAIL</span><span className="ch">REQUIS</span></label>
              <input type="email" id="email" name="email" required />
            </div>
            <div className="field">
              <label htmlFor="projet"><span>TYPE DE PROJET</span><span className="ch">→</span></label>
              <select id="projet" name="projet">
                <option>Site de présentation</option>
                <option>Site avec base de données</option>
                <option>Logiciel sur-mesure</option>
                <option>Application mobile</option>
                <option>Autre</option>
              </select>
            </div>
            <div className="field">
              <label htmlFor="budget"><span>BUDGET ESTIMÉ</span><span className="ch">→</span></label>
              <select id="budget" name="budget">
                <option>Moins de 1 000€</option>
                <option>1 000 — 3 000€</option>
                <option>3 000 — 8 000€</option>
                <option>8 000€ et +</option>
                <option>Je ne sais pas encore</option>
              </select>
            </div>
            <div className="field">
              <label htmlFor="message"><span>VOTRE PROJET</span><span className="ch">EN QUELQUES MOTS</span></label>
              <textarea id="message" name="message"></textarea>
            </div>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={status === 'sending'}
              style={
                status === 'sent' ? { background: '#39ff14', color: '#000', borderColor: '#39ff14' } :
                status === 'error' ? { background: '#ff4444', color: '#fff', borderColor: '#ff4444' } : {}
              }
            >
              {status === 'sent'    ? 'TRANSMIS ✓' :
               status === 'error'   ? 'ERREUR — RÉESSAYEZ' :
               status === 'sending' ? 'TRANSMISSION…' :
               <>ENVOYER <span className="arrow">→</span></>}
            </button>
          </form>
        </div>
      </div>
    </section>
  )
}
