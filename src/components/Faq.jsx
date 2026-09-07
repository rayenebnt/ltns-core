import { useId, useState } from 'react'

const faqs = [
  {
    q: 'Quels types de projets réalisez-vous ?',
    a: 'Quatre grandes familles : sites de présentation (particuliers, artisans, indépendants, entreprises), sites avec base de données (espaces membres, back-office, e-commerce custom), logiciels sur-mesure (outils métier, applications desktop) et applications mobiles iOS/Android. Tout est traité sur-mesure, sans template générique.'
  },
  {
    q: 'Quels sont les délais moyens ?',
    a: 'Site de présentation : ~2 semaines. Site avec base de données : 4 à 8 semaines selon la complexité. Logiciel / application mobile : délais définis lors du devis selon le périmètre fonctionnel.'
  },
  {
    q: 'À qui appartient le projet une fois livré ?',
    a: 'Vous, et vous seul. Code source, contenus, accès serveur, nom de domaine : tout vous appartient à la livraison. Vous restez libre de me quitter à tout moment, sans aucun verrouillage.'
  },
  {
    q: 'Comment se passe le devis ?',
    a: 'Devis gratuit, sans engagement. Envoyez le projet via le formulaire ou par email — je reviens sous 48h avec une proposition détaillée (périmètre, délai, tarif). On en discute ensemble avant toute signature.'
  },
  {
    q: 'Puis-je modifier mon projet moi-même après la livraison ?',
    a: 'Oui, selon la nature du projet. Pour un site, je peux livrer un espace admin simple et vous former à son utilisation. Pour un logiciel ou une app, une documentation technique est fournie. Pour toute évolution plus poussée, je reste disponible à la demande.'
  }
]

function FaqItem({ q, a, idx }) {
  const [open, setOpen] = useState(false)
  const uid = useId()
  const btnId = `faq-q-${uid}`
  const panelId = `faq-a-${uid}`

  return (
    <div className={`faq-item ${open ? 'open' : ''}`}>
      <h3 className="faq-h">
        <button
          type="button"
          className="faq-q"
          id={btnId}
          aria-expanded={open}
          aria-controls={panelId}
          onClick={() => setOpen((v) => !v)}
        >
          <span className="idx">Q.{String(idx + 1).padStart(2, '0')}</span>
          <span>{q}</span>
          <span className="faq-icon" aria-hidden="true"></span>
        </button>
      </h3>
      {/* L'ouverture est gérée en CSS (grid-template-rows 0fr → 1fr) :
          contrairement à un max-height mesuré au rendu, ça reste juste
          quand le texte se re-répartit au redimensionnement. */}
      <div className="faq-a" id={panelId} role="region" aria-labelledby={btnId}>
        <div className="faq-a-inner">{a}</div>
      </div>
    </div>
  )
}

export default function Faq() {
  return (
    <section id="faq">
      <div className="section-head reveal">
        <div>
          <span className="section-label">
            <b>05</b><span className="sep">//</span> QUESTIONS
          </span>
          <h2 className="section-title">FAQ <em>· lecture rapide</em>.</h2>
          <p className="section-intro">
            Les questions qui reviennent le plus souvent. Pour le reste,
            une ligne directe en bas de page.
          </p>
        </div>
        <div className="section-temp">
          90<span className="deg">°</span>
          <span className="label">RÉGIME · CHAUD</span>
        </div>
      </div>
      <div className="faq-list reveal">
        {faqs.map((f, i) => <FaqItem key={i} idx={i} {...f} />)}
      </div>
    </section>
  )
}
