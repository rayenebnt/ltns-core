import { useState } from 'react'

// 🔧 Remplace par tes coordonnées
const EMAIL = 'rayenebentorkia@gmail.com'
const PHONE = '0625206493'
const PHONE_INTL = '+33625206493'

export default function Contact() {
  const [status, setStatus] = useState('idle') // idle | sending | sent | error

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
      <div className="contact reveal">
        <div className="contact-grid">
          <div className="contact-info">
            <span className="section-label">05 — contact</span>
            <h2>
              Parlons de votre <em style={{ fontStyle: 'italic', color: 'var(--neon)' }}>projet</em>.
            </h2>
            <p>
              Devis gratuit sous 48h. Aucun engagement. On échange d'abord pour comprendre
              vos besoins, puis je vous propose une solution adaptée.
            </p>
            <div className="contact-direct">
              <a href={`mailto:${EMAIL}`}>✉ {EMAIL}</a>
              <a href={`tel:${PHONE}`}>📞 {PHONE}</a>
              <a href={`https://wa.me/${PHONE_INTL}`} target="_blank" rel="noopener noreferrer">
                💬 WhatsApp direct
              </a>
            </div>
          </div>

          <form onSubmit={handleSubmit} noValidate>
            <div className="field">
              <label htmlFor="nom">Nom</label>
              <input type="text" id="nom" name="nom" required />
            </div>
            <div className="field">
              <label htmlFor="email">Email</label>
              <input type="email" id="email" name="email" required />
            </div>
            <div className="field">
              <label htmlFor="projet">Type de projet</label>
              <select id="projet" name="projet">
                <option>Site de présentation</option>
                <option>Site avec base de données</option>
                <option>Logiciel sur-mesure</option>
                <option>Application mobile</option>
                <option>Autre</option>
              </select>
            </div>
            <div className="field">
              <label htmlFor="budget">Budget estimé</label>
              <select id="budget" name="budget">
                <option>Moins de 1 000€</option>
                <option>1 000 — 3 000€</option>
                <option>3 000 — 8 000€</option>
                <option>8 000€ et +</option>
                <option>Je ne sais pas encore</option>
              </select>
            </div>
            <div className="field">
              <label htmlFor="message">Votre projet en quelques mots</label>
              <textarea id="message" name="message"></textarea>
            </div>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={status === 'sending'}
              style={
                status === 'sent' ? { background: '#39ff14', color: '#000' } :
                status === 'error' ? { background: '#ff4444', color: '#fff' } : {}
              }
            >
              {status === 'sent'    ? 'Message envoyé ✓' :
               status === 'error'   ? 'Erreur — réessayez' :
               status === 'sending' ? 'Envoi en cours…' :
               <>Envoyer ma demande <span className="arrow">→</span></>}
            </button>
          </form>
        </div>
      </div>
    </section>
  )
}
