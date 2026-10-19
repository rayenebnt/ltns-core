import Home from './pages/Home'
import NotFound from './pages/NotFound'
import { MIN_PRICE, fmtPrice } from './data/formules'

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
