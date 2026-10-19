import Home from './pages/Home'
import CreationSiteVitrine from './pages/CreationSiteVitrine'
import LogicielSurMesure from './pages/LogicielSurMesure'
import RealisationPmsb from './pages/RealisationPmsb'
import NotFound from './pages/NotFound'
import { FORMULES, MIN_PRICE, fmtPrice } from './data/formules'
import { SITE } from './data/site'
import { services } from './components/Services'

// Table des pages du site : c'est d'ici que partent le rendu (navigateur et
// pré-rendu), le <head> de chaque page, le sitemap et le robots.txt.
//
// Chaque page :
// - Page : le composant affiché dans <main> ;
// - title, description : le <title> (60 signes au plus) et la meta description
//   (70 à 155 signes), vérifiés par le pré-rendu ;
// - ogTitle, ogImage : titre et image de l'aperçu au partage, si différents
//   (ogImage : { path, width, height, alt }) ;
// - updated : date de dernière modification (AAAA-MM-JJ), reprise dans le sitemap ;
// - noindex : vrai pour garder la page hors de Google (et du sitemap) ;
// - sections : les ancres (#id) présentes sur la page ; les liens vers les
//   autres ancres de l'accueil deviennent /#id ;
// - loader : vrai pour afficher l'écran de chauffe à l'arrivée ;
// - breadcrumb : fil d'Ariane [{ name, path }], ou null ;
// - schema : type de données structurées ('home', 'service', 'case', 'legal') ou null,
//   construites par src/seo/schema.js ;
// - schemaData : ce que ces données ont de propre à la page ('service' :
//   { name, serviceType, description, offers? } ; 'case' : { about }).

// Formules à prix fixe (Essentiel, Pro) et à prix sur devis (Sur-mesure)
const AVEC_PRIX = FORMULES.filter(f => f.price)
const SUR_DEVIS = FORMULES.filter(f => !f.price)
const [ESSENTIEL, PRO] = AVEC_PRIX
// Texte d'une carte de services de l'accueil : la description des données
// structurées reste celle qu'on lit sur le site
const serviceText = id => services.find(s => s.id === id).desc
// Fil d'Ariane : l'accueil, puis la page
const ariane = (name, path) => [{ name: 'Accueil', path: '/' }, { name, path }]

export const ROUTES = {
  '/': {
    Page: Home,
    title: `Création de site internet en France dès ${fmtPrice(MIN_PRICE)} € | LTNS°`,
    description: `Création de sites internet et de logiciels sur mesure, partout en France à distance, et sur place en Île-de-France. Dès ${fmtPrice(MIN_PRICE)} € TTC, devis gratuit sous 48h.`,
    ogTitle: 'LTNS° — Le web au bon degré.',
    updated: '2026-10-19',
    sections: ['tarifs', 'contact', 'realisations', 'services', 'process', 'faq'],
    loader: true,
    schema: 'home',
    breadcrumb: null,
  },

  '/creation-site-vitrine': {
    Page: CreationSiteVitrine,
    title: 'Création de site vitrine pour artisans et TPE | LTNS°',
    description: `Site vitrine pour artisans, TPE et associations partout en France : une page dès ${fmtPrice(ESSENTIEL.price)} € TTC, jusqu'à 6 pages dès ${fmtPrice(PRO.price)} € TTC. Prix fixé avant de commencer.`,
    updated: '2026-10-19',
    sections: ['contact'],
    loader: false,
    breadcrumb: ariane('Création de site vitrine', '/creation-site-vitrine'),
    schema: 'service',
    schemaData: {
      name: 'Création de site vitrine',
      serviceType: 'Création de site internet',
      description: serviceText('S01'),
      offers: AVEC_PRIX,
    },
  },

  '/logiciel-sur-mesure': {
    Page: LogicielSurMesure,
    title: 'Logiciel de gestion sur mesure pour votre métier | LTNS°',
    // Sans l'étude de cas, la page ne nomme pas PMSB
    description: SITE.flags.pmsbCaseStudy
      ? 'Un logiciel pensé pour votre métier : clients, devis, factures, stocks, plannings. Exemple réel : PMSB Gestion, livré en 4 semaines. Devis gratuit.'
      : 'Un logiciel pensé pour votre métier : clients, devis, factures, stocks, plannings. Prix fixé dans un devis gratuit, un seul interlocuteur.',
    updated: '2026-10-19',
    sections: ['contact'],
    loader: false,
    breadcrumb: ariane('Logiciel sur mesure', '/logiciel-sur-mesure'),
    schema: 'service',
    schemaData: {
      name: 'Logiciel de gestion sur mesure',
      serviceType: 'Développement de logiciel sur mesure',
      description: serviceText('S04'),
      offers: SUR_DEVIS,
    },
  },

  // Étude de cas : seulement avec l'accord du client (SITE.flags.pmsbCaseStudy).
  // Écrite dans dist/realisations/pmsb.html ; /realisations seul renvoie vers
  // l'accueil (vercel.json).
  ...(SITE.flags.pmsbCaseStudy && {
    '/realisations/pmsb': {
      Page: RealisationPmsb,
      title: "Site internet d'une entreprise du bâtiment : PMSB | LTNS°",
      description: 'PMSB, entreprise du bâtiment en Île-de-France : un site vitrine avec galerie de chantiers et demande de devis, puis son logiciel de gestion sur mesure.',
      ogImage: {
        path: '/realisations/pmsb.jpg',
        width: 1600,
        height: 916,
        alt: "Page d'accueil du site vitrine de PMSB (pmsbbatiment.fr)",
      },
      updated: '2026-10-19',
      sections: ['contact'],
      loader: false,
      breadcrumb: ariane('Réalisation PMSB', '/realisations/pmsb'),
      schema: 'case',
      schemaData: {
        about: {
          '@type': 'Organization',
          name: 'PMSB',
          alternateName: 'Prestations Multi Services Bâtiment',
          url: 'https://pmsbbatiment.fr',
        },
      },
    },
  }),
}

// Toute adresse inconnue : rendue dans dist/404.html, jamais indexée
export const NOT_FOUND = {
  Page: NotFound,
  title: 'Page introuvable | LTNS°',
  description: "Cette page n'existe pas ou a changé d'adresse. Retrouvez les tarifs, les réalisations et le devis gratuit de LTNS°.",
  noindex: true,
  sections: [],
  loader: false,
  breadcrumb: null,
  schema: null,
}

// Une seule forme par adresse : sans .html, sans /index, sans / final (sauf la racine)
export const normalize = p => (p.replace(/\.html$/, '').replace(/\/index$/, '/').replace(/(.)\/+$/, '$1') || '/')

export const resolve = p => ROUTES[normalize(p)] || NOT_FOUND
