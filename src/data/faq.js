import { FORMULES, priceText, delaiText, enDelai } from './formules'
import { SITE } from './site'

// Questions fréquentes de l'accueil, sous forme de données.
// Une réponse (a) est une liste de morceaux :
// - un texte simple s'affiche tel quel ;
// - { list: [{ b, t }] } devient une liste à puces « b : t » (b en gras).
// Lien facultatif après la réponse : link: { href, label }.
// Prix et délais viennent de src/data/formules.js, jamais écrits en dur.

const [ESSENTIEL, PRO] = FORMULES.filter(f => f.price)

export const FAQ = [
  {
    q: 'Quels types de projets faites-vous ?',
    a: ["Quatre grandes familles : les sites de présentation (artisans, indépendants, entreprises, associations), les sites avec boutique en ligne ou espace client, les logiciels faits pour votre métier, et les applications pour téléphone. Tout est créé sur mesure, jamais à partir d'un modèle tout prêt."],
  },
  {
    q: 'Combien coûte un site internet ?',
    a: [`Un site d'une seule page (formule ${ESSENTIEL.name}) : ${priceText(ESSENTIEL)}, ${enDelai(ESSENTIEL)}. Un site jusqu'à 6 pages (formule ${PRO.name}) : ${priceText(PRO)}, ${enDelai(PRO)}. Boutique en ligne, espace client, logiciel ou application : sur devis gratuit. Dans tous les cas, le prix est fixé avant de commencer.`],
    link: { href: '/creation-site-vitrine', label: 'Tout savoir sur la création de site vitrine' },
  },
  {
    q: 'Combien de temps faut-il pour créer mon projet ?',
    a: [`Un site d'une seule page : ${delaiText(ESSENTIEL)} ; un site jusqu'à 6 pages : ${delaiText(PRO)}. Un site avec boutique ou espace client : 4 à 8 semaines selon ce qu'il doit faire. Pour un logiciel ou une application mobile, la date de livraison est indiquée dans le devis, une fois qu'on a listé ensemble ce que vous voulez.`],
  },
  {
    q: "Travaillez-vous en dehors de l'Île-de-France ?",
    a: ['Oui, partout en France : tout peut se faire à distance (téléphone, WhatsApp, email). En Île-de-France, je peux aussi venir vous rencontrer sur place.'],
  },
  {
    q: 'Comment se passe le devis ?',
    a: ["Il est gratuit et ne vous engage à rien. Vous m'écrivez avec le formulaire ou par email, et je vous réponds sous 48h avec une proposition détaillée : ce qui est prévu, le délai et le prix. On en parle ensemble avant de signer quoi que ce soit."],
  },
  {
    q: 'À qui appartient le projet une fois livré ?',
    a: ["À vous, et à vous seul. Le site, les textes, les images, les mots de passe, l'adresse internet : tout vous revient le jour de la livraison. Si un jour vous voulez travailler avec quelqu'un d'autre, vous êtes libre de le faire."],
  },
  {
    q: 'Mon site sera-t-il bien placé sur Google ?',
    a: [`Chaque site est construit avec les bases pour être trouvé sur Google ; la formule ${PRO.name} ajoute un référencement plus poussé et le suivi des visites. Personne ne peut garantir une position sur Google.`],
  },
  {
    q: "Et après la mise en ligne, qui s'occupe de mon site ?",
    a: [
      "Moi, si vous le souhaitez, avec un suivi de maintenance. Vous n'avez plus à y penser :",
      {
        list: [
          { b: 'Mises à jour et sécurité', t: 'votre site reste à jour et protégé.' },
          { b: 'Sauvegardes régulières', t: "rien n'est perdu en cas de problème." },
          { b: 'Surveillance', t: 'je vérifie que le site reste en ligne et rapide.' },
          { b: 'Petites modifications', t: "un texte, une photo, un horaire à changer ? Un message suffit, je m'en charge." },
          { b: 'Un interlocuteur joignable', t: 'en cas de souci, vous savez qui appeler.' },
        ],
      },
      "La maintenance est proposée en option dans votre devis, avec un prix fixé à l'avance.",
    ],
  },
  // Seulement quand le prix après la 1re année est connu (SITE.hostingAfterFirstYear,
  // écrit tel qu'il doit s'afficher, ex. « … € TTC par an »)
  ...(SITE.hostingAfterFirstYear ? [{
    q: 'Que se passe-t-il après la 1re année en ligne offerte ?',
    a: [`La 1re année en ligne est offerte. Les années suivantes, l'hébergement de votre site coûte ${SITE.hostingAfterFirstYear}.`],
  }] : []),
]
