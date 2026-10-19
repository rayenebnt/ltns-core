// Les informations sur LTNS° et son propriétaire : c'est le SEUL endroit où les
// modifier. Tout ce qui vaut TODO s'affiche « [à compléter] » sur le site et
// bloque ce qui en dépend (ex. les mentions légales restent hors de Google).

export const TODO = '[à compléter]'

// Vrai si la valeur manque encore (vide, absente ou « [à compléter] »)
export const isTodo = v => typeof v !== 'string' || !v.trim() || v.includes('[à compléter')

// Les seules adresses réelles (https) d'un objet de liens, sans les TODO
export const realUrls = o => Object.values(o).filter(u => typeof u === 'string' && /^https:/.test(u))

export const SITE = {
  url: 'https://ltns.fr',
  name: 'LTNS°',
  alternateName: 'LTNS',
  slogan: 'Le web au bon degré.',

  email: 'ltnscore@gmail.com',
  phoneDisplay: '06 25 20 64 93',
  phoneE164: '+33625206493',
  phoneSchema: '+33 6 25 20 64 93',
  whatsapp: '33625206493',

  // Zone où je me déplace chez le client (et zone de la fiche Google).
  // À distance, le travail se fait partout en France.
  area: 'Île-de-France',
  areaWikidata: 'https://www.wikidata.org/wiki/Q13917',
  founderFirstName: 'Rayene',

  logo: { path: '/logo/ltns-logo-720.png', width: 720, height: 720 },
  ogImage: {
    path: '/og.jpg',
    width: 1200,
    height: 630,
    alt: "LTNS°\u00a0: «\u00a0Vos futurs clients vous cherchent en ligne.\u00a0» au-dessus d'une barre de recherche",
  },

  sameAs: {
    // Adresse du compte TikTok (https://www.tiktok.com/@…) une fois le compte public
    tiktok: TODO,
    // Lien de la fiche Google (bouton « Partager » de la fiche) une fois validée
    googleMaps: TODO,
  },
  // vercel : vrai seulement si Web Analytics est activé dans le projet Vercel (les
  // mentions légales l'annoncent alors comme un fait) ; sinon false
  analytics: { vercel: true },
  flags: { pmsbCaseStudy: true },
  // Prix de l'hébergement après la 1re année offerte. Tant qu'il vaut null,
  // rien n'est publié à ce sujet.
  hostingAfterFirstYear: null,
}

export const LEGAL = {
  firstName: 'Rayene',
  // Nom de famille, tel qu'il figure à l'INSEE
  lastName: TODO,
  // Forme juridique : « Entrepreneur individuel (EI) » si c'est le cas
  legalForm: TODO,
  // N° SIRET à 14 chiffres (avis de situation INSEE)
  siret: TODO,
  // Adresse de l'entreprise (siège ou domiciliation)
  address: TODO,
  // N° de TVA intracommunautaire, ou « TVA non applicable, art. 293 B du CGI »
  vat: TODO,

  host: {
    name: 'Vercel Inc.',
    // Adresse postale de l'hébergeur : à recopier depuis vercel.com/legal
    address: TODO,
    // Téléphone de l'hébergeur : à recopier depuis vercel.com/legal
    phone: TODO,
    url: 'https://vercel.com',
  },

  mediator: {
    // Médiateur de la consommation auquel vous adhérez : son nom…
    name: TODO,
    // …et l'adresse de son site
    url: TODO,
  },

  // Transferts de données hors de l'Union européenne et leurs garanties
  // (Formspree, Google, Vercel…), à vérifier auprès de chaque service
  transfers: TODO,
  // Durée de conservation des demandes de contact. Suggestion :
  // « 3 ans à compter de notre dernier échange », à confirmer
  retention: TODO,

  updated: '2026-10-19',
}

// Vrai seulement quand toutes les mentions obligatoires sont renseignées
export const legalComplete = () => ![
  LEGAL.lastName, LEGAL.legalForm, LEGAL.siret, LEGAL.address, LEGAL.vat,
  LEGAL.host.address, LEGAL.host.phone,
  LEGAL.mediator.name, LEGAL.mediator.url,
  LEGAL.transfers, LEGAL.retention,
].some(isTodo)
