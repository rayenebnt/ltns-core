// Une section de page intérieure, au style des sections de l'accueil : filet,
// étiquette numérotée, titre (h2) et chapeau facultatif, puis le contenu.
// id : ancre de la section (unique dans la page) ; num : « 01 », « 02 »…

// Espace insécable avant « ? », « ! », « : » et « ; » : en gros caractères,
// la ponctuation ne passe jamais seule à la ligne
const nbsp = t => (typeof t === 'string' ? t.replace(/ ([?!:;])/g, '\u00a0$1') : t)

export default function PageSection({ id, num, label, title, intro, children }) {
  return (
    <section id={id} className="page-section">
      <div className="section-head reveal">
        <div>
          <span className="section-label">
            <b>{num}</b><span className="sep">//</span> {label}
          </span>
          <h2 className="section-title section-title--sm">{nbsp(title)}</h2>
          {intro && <p className="section-intro">{intro}</p>}
        </div>
      </div>
      {children}
    </section>
  )
}
