import { nbsp } from '../../lib/typo'

// En-tête d'une page intérieure : fil d'Ariane visible, étiquette, titre (le seul h1
// de la page), chapeau et boutons. Le style reprend celui des sections de l'accueil.
// current : nom de la page dans le fil d'Ariane (sans lui, pas de fil d'Ariane) ;
// lead et ctas sont facultatifs. Titre et chapeau en typographie française.

export default function PageHero({ label, title, lead, current, ctas }) {
  return (
    <header className="page-hero">
      {current && (
        <nav className="breadcrumb" aria-label="Fil d'Ariane">
          <a href="/">Accueil</a>
          <span aria-hidden="true">/</span>
          <span aria-current="page">{current}</span>
        </nav>
      )}
      {label && <span className="section-label">{label}</span>}
      <h1 className="page-title">{nbsp(title)}</h1>
      {lead && <p className="page-lead">{nbsp(lead)}</p>}
      {ctas && <div className="page-ctas">{ctas}</div>}
    </header>
  )
}
