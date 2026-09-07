import { useState, useRef } from 'react'

const faqs = [
  {
    q: 'Quels types de projets faites-vous ?',
    a: 'Quatre grandes familles : les sites de présentation (artisans, indépendants, entreprises, associations), les sites avec boutique en ligne ou espace client, les logiciels faits pour votre métier, et les applications pour téléphone. Tout est créé sur mesure, jamais à partir d\'un modèle tout prêt.'
  },
  {
    q: 'Combien de temps faut-il pour créer mon projet ?',
    a: 'Un site de présentation : environ 2 semaines. Un site avec boutique ou espace client : 4 à 8 semaines selon ce qu\'il doit faire. Pour un logiciel ou une application mobile, la date de livraison est indiquée dans le devis, une fois qu\'on a listé ensemble ce que vous voulez.'
  },
  {
    q: 'À qui appartient le projet une fois livré ?',
    a: 'À vous, et à vous seul. Le site, les textes, les images, les mots de passe, l\'adresse internet : tout vous revient le jour de la livraison. Si un jour vous voulez travailler avec quelqu\'un d\'autre, vous êtes libre de le faire.'
  },
  {
    q: 'Comment se passe le devis ?',
    a: 'Il est gratuit et ne vous engage à rien. Vous m\'écrivez avec le formulaire ou par email, et je vous réponds sous 48h avec une proposition détaillée : ce qui est prévu, le délai et le prix. On en parle ensemble avant de signer quoi que ce soit.'
  },
  {
    q: 'Puis-je faire des modifications moi-même ?',
    a: 'Oui, dans la plupart des cas. Pour un site, je peux ajouter un espace simple où vous changez vos textes et vos photos, et je vous montre comment faire. Pour un logiciel ou une application, je vous remets un guide clair. Et pour les changements plus importants, je reste joignable.'
  }
]

function FaqItem({ q, a, idx }) {
  const [open, setOpen] = useState(false)
  const answerRef = useRef(null)

  return (
    <div className={`faq-item ${open ? 'open' : ''}`}>
      <button
        className="faq-q"
        aria-expanded={open}
        onClick={() => setOpen(!open)}
      >
        <span className="idx">Q.{String(idx + 1).padStart(2, '0')}</span>
        <span>{q}</span>
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
      <div className="section-head reveal">
        <div>
          <span className="section-label">
            <b>05</b><span className="sep">//</span> QUESTIONS
          </span>
          <h2 className="section-title">Vos questions,<br/><em>mes réponses</em>.</h2>
          <p className="section-intro">
            Les questions qu'on me pose le plus souvent. Si la vôtre n'y est pas,
            écrivez-moi : mes coordonnées sont juste en dessous.
          </p>
        </div>
        <div className="section-temp">
          90<span className="deg">°</span>
          <span className="label">RÉPONSES CLAIRES</span>
        </div>
      </div>
      <div className="faq-list reveal">
        {faqs.map((f, i) => <FaqItem key={i} idx={i} {...f} />)}
      </div>
    </section>
  )
}
