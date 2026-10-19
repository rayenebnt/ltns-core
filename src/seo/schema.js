import { SITE, realUrls } from '../data/site.js'
import { FORMULES, MIN_PRICE, fmtPrice } from '../data/formules.js'

// Données structurées (JSON-LD) de chaque page : elles disent à Google, en
// langage machine, qui est LTNS°, ce qu'il propose et où. Mêmes nom, téléphone,
// zone et logo que la fiche Google. Tout vient de src/data/ : rien d'inventé.
// Le pré-rendu (scripts/prerender.mjs) contrôle le résultat à chaque build.

// Adresse absolue d'une page : sans / final, sauf la racine
const abs = path => SITE.url + (path === '/' ? '/' : path)
// Identifiant d'un élément : adresse de sa page + #fragment
const id = (path, fragment) => abs(path) + '#' + fragment
// Renvoi vers un élément décrit ailleurs dans la même page
const ref = i => ({ '@id': i })

const ORG = id('/', 'organization')
const WEBSITE = id('/', 'website')
const LOGO = id('/', 'logo')

// « Sur-mesure » → « sur-mesure », « Essentiel » → « essentiel »
const slug = s => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
  .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
const lowerFirst = s => s.charAt(0).toLowerCase() + s.slice(1)

// Zone desservie : partout en France à distance, et l'Île-de-France sur place
// (#zone, la zone de la fiche Google)
export const zone = () => [
  { '@type': 'Country', '@id': id('/', 'france'), name: 'France' },
  { '@type': 'AdministrativeArea', '@id': id('/', 'zone'), name: SITE.area, sameAs: SITE.areaWikidata },
]
const zoneRefs = () => zone().map(z => ref(z['@id']))

// Une formule de src/data/formules.js : prix « à partir de » quand il est
// fixé (avec un lien vers la page du site vitrine), sinon sur devis, sans prix
const offerId = f => id('/', 'offre-' + slug(f.name))

// Fin de la description : le délai, et « sur devis gratuit » quand il n'y a pas de prix
const terms = f => (f.price ? `Délai : ${lowerFirst(f.delai)}.` : `Sur devis gratuit, délai ${lowerFirst(f.delai)}.`)

const offer = f => {
  const serviceType = f.price ? 'Création de site internet' : 'Développement web et mobile sur mesure'
  return {
    '@type': 'Offer',
    '@id': offerId(f),
    name: `Formule ${f.name}`,
    description: `${f.pitch} ${f.features.filter(x => !x.includes('Google')).join(' · ')}. ${terms(f)}`,
    url: f.price ? abs('/creation-site-vitrine') : id('/', 'tarifs'),
    ...(f.price && {
      priceSpecification: { '@type': 'PriceSpecification', minPrice: f.price, priceCurrency: 'EUR' },
    }),
    itemOffered: {
      '@type': 'Service',
      name: `${serviceType} : formule ${f.name}`,
      serviceType,
      provider: ref(ORG),
      areaServed: zoneRefs(),
    },
  }
}

// L'entreprise, décrite en entier sur chaque page (logo et zone compris) :
// tous les renvois { '@id' } de la page trouvent ainsi leur cible
export const organization = () => {
  const sameAs = realUrls(SITE.sameAs)
  const map = realUrls({ map: SITE.sameAs.googleMaps })[0]
  return {
    '@type': 'LocalBusiness',
    '@id': ORG,
    name: SITE.name,
    alternateName: SITE.alternateName,
    url: abs('/'),
    logo: {
      '@type': 'ImageObject',
      '@id': LOGO,
      url: SITE.url + SITE.logo.path,
      contentUrl: SITE.url + SITE.logo.path,
      width: SITE.logo.width,
      height: SITE.logo.height,
      caption: SITE.name,
    },
    image: ref(LOGO),
    description: 'Studio indépendant de création web : sites internet, logiciels de gestion sur mesure et applications mobiles, pour des clients partout en France à distance, et sur place en Île-de-France. Un seul interlocuteur du premier échange à la mise en ligne.',
    slogan: SITE.slogan,
    telephone: SITE.phoneSchema,
    email: SITE.email,
    // Région seulement : l'adresse précise reste privée, comme sur la fiche Google
    address: { '@type': 'PostalAddress', addressRegion: SITE.area, addressCountry: 'FR' },
    areaServed: zone(),
    priceRange: `À partir de ${fmtPrice(MIN_PRICE)} €`,
    currenciesAccepted: 'EUR',
    founder: { '@type': 'Person', name: SITE.founderFirstName },
    contactPoint: {
      '@type': 'ContactPoint',
      contactType: 'sales',
      telephone: SITE.phoneSchema,
      email: SITE.email,
      areaServed: 'FR',
      availableLanguage: 'fr',
    },
    knowsAbout: [
      'Création de sites internet',
      'Boutiques en ligne et espaces clients',
      'Logiciels de gestion sur mesure',
      'Applications mobiles iPhone et Android',
      'Design et identité visuelle',
    ],
    hasOfferCatalog: {
      '@type': 'OfferCatalog',
      name: `Formules ${SITE.name}`,
      itemListElement: FORMULES.map(offer),
    },
    // Profils publics (TikTok, fiche Google) : seulement les vraies adresses
    ...(sameAs.length && { sameAs }),
    ...(map && { hasMap: map }),
  }
}

export const website = () => ({
  '@type': 'WebSite',
  '@id': WEBSITE,
  url: abs('/'),
  name: SITE.name,
  alternateName: [SITE.alternateName, SITE.url.replace(/^https?:\/\//, '')],
  inLanguage: 'fr-FR',
  publisher: ref(ORG),
})

// Fil d'Ariane, identique à celui affiché en haut de la page
export const breadcrumb = (path, route) => ({
  '@type': 'BreadcrumbList',
  '@id': id(path, 'breadcrumb'),
  itemListElement: route.breadcrumb.map((b, i) => ({
    '@type': 'ListItem',
    position: i + 1,
    name: b.name,
    item: abs(b.path),
  })),
})

// Page de service (route.schemaData) : { name, serviceType, description,
// offers: formules de FORMULES concernées (facultatif) }
export const service = (path, data) => ({
  '@type': 'Service',
  '@id': id(path, 'service'),
  name: data.name,
  serviceType: data.serviceType,
  description: data.description,
  url: abs(path),
  provider: ref(ORG),
  areaServed: zoneRefs(),
  ...(data.offers?.length && { offers: data.offers.map(f => ref(offerId(f))) }),
})

// Le sujet de chaque type de page
const ABOUT = {
  home: () => ref(ORG),
  service: path => ref(id(path, 'service')),
  // Étude de cas : le client présenté (route.schemaData.about)
  case: (path, route) => route.schemaData.about,
  legal: () => ref(ORG),
}

export const webPage = (path, route) => ({
  '@type': 'WebPage',
  '@id': id(path, 'webpage'),
  url: abs(path),
  name: route.title,
  description: route.description,
  inLanguage: 'fr-FR',
  isPartOf: ref(WEBSITE),
  about: ABOUT[route.schema](path, route),
  ...(route.breadcrumb && { breadcrumb: ref(id(path, 'breadcrumb')) }),
  ...(route.ogImage && {
    primaryImageOfPage: {
      '@type': 'ImageObject',
      url: SITE.url + route.ogImage.path,
      width: route.ogImage.width,
      height: route.ogImage.height,
    },
  }),
  dateModified: route.updated,
})

// Le JSON-LD complet d'une page, ou null (page hors de Google, ou sans données)
export function jsonLdFor(path, route) {
  if (route.noindex || !route.schema) return null
  if (!ABOUT[route.schema]) throw new Error(`schema inconnu pour ${path} : « ${route.schema} »`)
  return {
    '@context': 'https://schema.org',
    '@graph': [
      organization(),
      website(),
      ...(route.schema === 'service' ? [service(path, route.schemaData)] : []),
      ...(route.breadcrumb ? [breadcrumb(path, route)] : []),
      webPage(path, route),
    ],
  }
}
