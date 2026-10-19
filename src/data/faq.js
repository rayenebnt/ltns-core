// Questions fréquentes de l'accueil, sous forme de données.
// Une réponse (a) est une liste de morceaux :
// - un texte simple s'affiche tel quel ;
// - { list: [{ b, t }] } devient une liste à puces « b : t » (b en gras).
// Lien facultatif après la réponse : link: { href, label }.
export const FAQ = [
  {
    q: 'Quels types de projets faites-vous ?',
    a: ["Quatre grandes familles : les sites de présentation (artisans, indépendants, entreprises, associations), les sites avec boutique en ligne ou espace client, les logiciels faits pour votre métier, et les applications pour téléphone. Tout est créé sur mesure, jamais à partir d'un modèle tout prêt."],
  },
  {
    q: 'Combien de temps faut-il pour créer mon projet ?',
    a: ["Un site de présentation : environ 2 semaines. Un site avec boutique ou espace client : 4 à 8 semaines selon ce qu'il doit faire. Pour un logiciel ou une application mobile, la date de livraison est indiquée dans le devis, une fois qu'on a listé ensemble ce que vous voulez."],
  },
  {
    q: 'À qui appartient le projet une fois livré ?',
    a: ["À vous, et à vous seul. Le site, les textes, les images, les mots de passe, l'adresse internet : tout vous revient le jour de la livraison. Si un jour vous voulez travailler avec quelqu'un d'autre, vous êtes libre de le faire."],
  },
  {
    q: 'Comment se passe le devis ?',
    a: ["Il est gratuit et ne vous engage à rien. Vous m'écrivez avec le formulaire ou par email, et je vous réponds sous 48h avec une proposition détaillée : ce qui est prévu, le délai et le prix. On en parle ensemble avant de signer quoi que ce soit."],
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
]
