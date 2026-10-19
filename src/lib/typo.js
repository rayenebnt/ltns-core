// Typographie française des textes affichés : espace insécable avant « ? », « ! »,
// « : », « ; » et « », après « », et entre un prix et « € ». La ponctuation et le
// symbole ne passent jamais seuls à la ligne, même en gros caractères.
// Simple transformation d'un texte : le HTML du serveur et celui du navigateur
// restent identiques. Tout ce qui n'est pas un texte est rendu tel quel.
export const nbsp = t => (typeof t === 'string'
  ? t.replace(/ ([?!:;»])/g, ' $1').replace(/« /g, '« ').replace(/(\d) €/g, '$1 €')
  : t)
