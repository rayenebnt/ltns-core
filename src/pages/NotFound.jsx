import PageHero from '../components/page/PageHero'
import { FORMULES, fmtPrice } from '../data/formules'
import { SITE } from '../data/site'
import { useSectionHref } from '../lib/route'

// Page affichée pour toute adresse inconnue (dist/404.html, servie par Vercel avec
// le code 404). Hors de Google ; des liens vers les pages utiles, sans formulaire.

const [ESSENTIEL, PRO] = FORMULES.filter(f => f.price)

export default function NotFound() {
  const href = useSectionHref()

  const links = [
    { href: '/', title: 'Accueil', text: 'Tarifs, réalisations, services et questions fréquentes.' },
    {
      href: '/creation-site-vitrine',
      title: 'Création de site vitrine',
      text: `Une page dès ${fmtPrice(ESSENTIEL.price)}\u00a0€ TTC, jusqu'à 6 pages dès ${fmtPrice(PRO.price)}\u00a0€ TTC.`,
    },
    { href: '/logiciel-sur-mesure', title: 'Logiciel de gestion sur mesure', text: 'Un outil pensé pour votre métier, sur devis gratuit.' },
    {
      href: href('tarifs'),
      title: 'Tarifs',
      text: `Les formules ${FORMULES.map(f => f.name).join(', ').replace(/, ([^,]*)$/, ' et $1')}\u00a0: prix fixé avant de commencer.`,
    },
    { href: href('contact'), title: 'Demander un devis gratuit', text: 'Décrivez votre projet en 1 minute\u00a0: devis détaillé sous 48h, sans engagement.' },
    { href: `tel:${SITE.phoneE164}`, title: `Appeler · ${SITE.phoneDisplay}`, text: 'Pour parler directement de votre projet.' },
  ]

  return (
    <>
      <PageHero
        label={<><b>404</b><span className="sep">//</span> PAGE INTROUVABLE</>}
        title="Page introuvable"
        lead="Cette page n'existe pas ou a changé d'adresse."
      />

      <section className="page-section" aria-label="Pages utiles">
        <ul className="link-cards">
          {links.map((l, i) => (
            <li key={l.href}>
              <a href={l.href}>
                <span className="num">{String(i + 1).padStart(2, '0')}</span>
                <b>{l.title}</b>
                <span>{l.text}</span>
                <span className="arrow" aria-hidden="true">→</span>
              </a>
            </li>
          ))}
        </ul>
      </section>
    </>
  )
}
