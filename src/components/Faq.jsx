import { useState, useRef } from 'react'

const faqs = [
  {
    q: 'Quels types de projets réalisez-vous ?',
    a: 'Je travaille sur quatre grandes familles de projets : les sites de présentation (particuliers, artisans, indépendants, entreprises), les sites avec base de données (espaces membres, back-office, e-commerce custom), les logiciels sur-mesure (outils métier, applications desktop) et les applications mobiles (iOS et Android). Chaque projet est traité sur-mesure, sans template générique.'
  },
  {
    q: 'Quels sont les délais moyens ?',
    a: 'Un site de présentation est généralement livré en 2 semaines. Un site avec base de données entre 4 et 8 semaines selon la complexité. Pour un logiciel ou une application mobile, les délais sont définis lors du devis en fonction du périmètre fonctionnel.'
  },
  {
    q: 'À qui appartient le projet une fois livré ?',
    a: 'Vous, et vous seul. Code source, contenus, accès serveur, nom de domaine : tout vous appartient à la livraison. Vous restez libre de me quitter à tout moment, sans aucun verrouillage.'
  },
  {
    q: 'Comment se passe le devis ?',
    a: 'Le devis est gratuit, sans engagement. Envoyez-moi votre projet via le formulaire ou directement par email — je reviens vers vous sous 48h avec une proposition détaillée (périmètre, délai, tarif). On en discute ensemble avant toute signature.'
  },
  {
    q: 'Puis-je modifier mon projet moi-même après la livraison ?',
    a: 'Oui, selon la nature du projet. Pour un site, je peux vous livrer un espace admin simple et vous former à son utilisation. Pour un logiciel ou une app, une documentation technique est fournie. Pour toute évolution plus poussée, je reste disponible à la demande.'
  }
]

function FaqItem({ q, a }) {
  const [open, setOpen] = useState(false)
  const answerRef = useRef(null)

  return (
    <div className={`faq-item ${open ? 'open' : ''}`}>
      <button
        className="faq-q"
        aria-expanded={open}
        onClick={() => setOpen(!open)}
      >
        {q}
        <span className="faq-icon" aria-hidden="true"></span>
      </button>
      <div
        className="faq-a"
        ref={answerRef}
        style={{ maxHeight: open ? answerRef.current?.scrollHeight + 'px' : '0' }}
      >
        <div className="faq-a-inner">{a}</div>
      </div>
    </div>
  )
}

export default function Faq() {
  return (
    <section id="faq">
      <div className="reveal">
        <span className="section-label">04 — questions</span>
        <h2 className="section-title">Questions <em>fréquentes</em>.</h2>
      </div>
      <div className="faq-list reveal">
        {faqs.map((f, i) => <FaqItem key={i} {...f} />)}
      </div>
    </section>
  )
}
