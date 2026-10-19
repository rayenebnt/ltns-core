import Home from './pages/Home'
import NotFound from './pages/NotFound'

// Table des pages du site : c'est d'ici que partent le rendu (navigateur et
// pré-rendu), le <head> de chaque page, le sitemap et le robots.txt.
//
// Chaque page :
// - Page : le composant affiché dans <main> ;
// - title, description : le <title> et la meta description ;
// - updated : date de dernière modification (AAAA-MM-JJ), reprise dans le sitemap ;
// - noindex : vrai pour garder la page hors de Google (et du sitemap) ;
// - sections : les ancres (#id) présentes sur la page ; les liens vers les
//   autres ancres de l'accueil deviennent /#id ;
// - loader : vrai pour afficher l'écran de chauffe à l'arrivée ;
// - breadcrumb : fil d'Ariane [{ name, path }], ou null ;
// - schema : type de données structurées ('home', 'service', 'case', 'legal') ou null.
export const ROUTES = {
  '/': {
    Page: Home,
    // Provisoires : les textes d'avant le pré-rendu, remplacés avec les
    // métadonnées de chaque page
    title: 'LTNS° — Le web au bon degré.',
    description: "LTNS° — Création de sites internet, de logiciels et d'applications mobiles pour les particuliers et les professionnels. Le web au bon degré.",
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
