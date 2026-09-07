// Types de projet partagés entre les cartes Services, les formules Tarifs
// et le formulaire de contact — un seul vocabulaire, pas de divergence.
export const PROJECT_TYPES = {
  VITRINE:  'Site de présentation',
  PRO:      'Site professionnel (multi-pages)',
  BDD:      'Site avec base de données',
  LOGICIEL: 'Logiciel sur-mesure',
  MOBILE:   'Application mobile',
  DESIGN:   'Design UI/UX',
  AUTRE:    'Autre / je ne sais pas encore',
}

export const PROJECT_OPTIONS = Object.values(PROJECT_TYPES)

export const QUOTE_EVENT = 'ltns:devis'

// Cliquer sur une gamme ou une formule pré-remplit le formulaire :
// l'utilisateur n'a pas à re-saisir ce qu'il vient de choisir.
export function requestQuote(detail) {
  window.dispatchEvent(new CustomEvent(QUOTE_EVENT, { detail }))
}
