import { FaqItem } from '../Faq'

// Questions fréquentes d'une page intérieure, avec le même accordéon que l'accueil.
// items : [{ q, a, link? }] ; a peut être un simple texte (voir src/data/faq.js).
export default function FaqList({ items }) {
  return (
    <div className="faq-list">
      {items.map((f, i) => <FaqItem key={i} idx={i} {...f} />)}
    </div>
  )
}
