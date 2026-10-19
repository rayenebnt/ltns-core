// Formules affichées — prix, contenu et délais modifiables ici.
// price: null → « sur devis » : le bouton mène au devis détaillé.
// Sinon le bouton ouvre une demande directe (nom, email, téléphone).
// Un « 1re » en début de ligne s'affiche en exposant sur la carte (Tarifs.jsx).
export const FORMULES = [
  {
    id: '01', name: 'Essentiel', temp: 38, heat: 'TIÈDE',
    pitch: 'Pour être présent sur internet, simplement.',
    price: 490,
    pour: 'Artisans, indépendants',
    delai: '≈ 2 semaines',
    features: [
      "Un site d'une seule page",
      'Lisible sur ordinateur et téléphone',
      'Design créé pour vous',
      'Formulaire de contact',
      'Les bases pour être trouvé sur Google',
      '1re année en ligne offerte',
    ],
  },
  {
    id: '02', name: 'Pro', temp: 66, heat: 'CHAUD', featured: true,
    pitch: 'Un site complet qui travaille pour vous.',
    price: 990,
    pour: 'Entreprises, associations',
    delai: '2 à 4 semaines',
    features: [
      "Jusqu'à 6 pages",
      'Design soigné, simple à utiliser',
      'Animations créées pour vous',
      'Un espace pour modifier vos textes',
      'Référencement Google plus poussé + suivi des visites',
      '1re année en ligne offerte',
    ],
  },
  {
    id: '03', name: 'Sur-mesure', temp: 99, heat: 'BRÛLANT',
    pitch: 'Boutique, logiciel ou application : on construit votre outil.',
    price: null,
    pour: 'Projets plus ambitieux',
    delai: 'Fixé dans le devis',
    features: [
      'Boutique en ligne ou espace client',
      'Logiciel ou application mobile',
      'Des fonctions rien que pour vous',
      'Connexion avec vos autres outils',
      'Suivi et mises à jour dans la durée',
    ],
  },
]

// Ce que toutes les formules ont en commun
export const INCLUS = [
  'Devis gratuit sous 48h',
  "Prix fixé avant de commencer",
  'Un seul interlocuteur',
  'Tout vous appartient',
]

export const fmtPrice = v => Math.round(v).toLocaleString('fr-FR')
export const priceLabel = f => `à partir de ${fmtPrice(f.price)} € TTC`

// Le prix d'appel (« dès … € ») : la plus petite formule à prix fixe
export const MIN_PRICE = Math.min(...FORMULES.filter(f => f.price).map(f => f.price))
