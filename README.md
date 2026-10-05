# LTNS° — Site React

> Le web au bon degré.

Site one-page de présentation pour activité freelance de création de sites internet.
Version **React + Vite**.

## 🚀 Stack

- **React 18** — composants réutilisables, hooks
- **Vite** — build ultra rapide, HMR instantané
- **Three.js** — scène 3D de la visite guidée (chargée à la demande)
- **GSAP + ScrollTrigger** — animations d'entrée et au scroll
- **CSS pur** (variables CSS, Grid, Flexbox)
- **Google Fonts** : Space Grotesk · Inter Tight · JetBrains Mono

## 📁 Structure

```
ltns-react/
├── index.html              # Point d'entrée HTML (Vite)
├── package.json
├── vite.config.js
├── public/                 # Fichiers statiques
│   └── realisations/       # Photos de présentation des projets
└── src/
    ├── main.jsx            # Bootstrap React
    ├── App.jsx             # Composant racine
    ├── components/
    │   ├── Loader.jsx
    │   ├── Cursor.jsx      # Curseur custom néon
    │   ├── Nav.jsx
    │   ├── Hero.jsx        # Titre + readout, animation GSAP
    │   ├── Parcours.jsx    # Visite guidée de A à Z, scène Three.js plein écran
    │   ├── ParcoursTrigger.jsx  # Accès à la visite guidée : hero, nav, bandeau, pastille
    │   ├── Pourquoi.jsx
    │   ├── Services.jsx    # Cards avec tilt 3D
    │   ├── Process.jsx
    │   ├── Realisations.jsx # Projets livrés + photo de présentation
    │   ├── Tarifs.jsx      # 3 formules animées, pré-remplissent le devis
    │   ├── Faq.jsx         # Accordéon avec state
    │   ├── Contact.jsx     # Formulaire avec state
    │   └── Footer.jsx
    ├── hooks/
    │   └── useReveal.js    # Hook pour les animations au scroll
    └── styles/
        └── global.css      # Tous les styles
```

## ▶️ Installation et lancement

```bash
# 1. Installer les dépendances
npm install

# 2. Lancer en mode dev (ouvre http://localhost:5173)
npm run dev

# 3. Build pour la production
npm run build

# 4. Prévisualiser le build
npm run preview
```

## 💡 Ouvrir dans VS Code

```bash
code ltns-react
```

Puis dans le terminal intégré : `npm install` puis `npm run dev`.

## ✏️ Personnalisation

### Coordonnées (Contact)

Dans `src/components/Contact.jsx`, modifie en haut du fichier :
```js
const EMAIL = 'ton@email.com'
const PHONE = '+33612345678'
```

### Tarifs

Section placée juste après l'accueil, au-dessus du devis. Les formules (prix, contenu,
délai, public) sont dans le tableau `FORMULES` en haut de `src/components/Tarifs.jsx`.

- **Essentiel / Pro** (formules avec un prix) : le bouton ouvre une demande directe.
  Le visiteur laisse seulement nom, email, téléphone et activité (facultatifs pour les
  deux derniers). La demande part sur le même Formspree que le devis (`FORMSPREE_URL`
  dans `Contact.jsx`), donc à la même adresse email, avec la formule, le prix, une
  référence et l'objet « Formule Pro — Nom ».
- **Sur-mesure** (`price: null`, affiché « Sur devis ») : le bouton mène au devis
  détaillé, avec la formule pré-remplie.

Motion design (GSAP + ScrollTrigger) : les cartes montent, la jauge de chauffe
s'allume segment par segment, température et prix défilent, le badge « le plus
choisi » se tamponne, puis la formule Pro garde une bordure qui tourne. La demande
directe s'ouvre en se propageant depuis le bouton cliqué, et son thermomètre monte
jusqu'à 99° à l'envoi. Tout est
désactivé si le visiteur a choisi de réduire les animations.

### Couleur d'accent (néon violet par défaut)

Dans `src/styles/global.css`, modifie les variables :
```css
--neon: #a855f7;
--neon-2: #c084fc;
--neon-glow: rgba(168, 85, 247, 0.5);
--neon-soft: rgba(168, 85, 247, 0.12);
```

Alternatives :
- Cyan : `#00f0ff` / glow `rgba(0, 240, 255, 0.5)`
- Vert : `#39ff14` / glow `rgba(57, 255, 20, 0.5)`
- Magenta : `#ff2d95` / glow `rgba(255, 45, 149, 0.5)`

### Services / FAQ / Process

Chaque section a ses données en haut du composant, dans un tableau facile à modifier.

### Réalisations

Les projets sont listés dans le tableau `projects` en haut de
`src/components/Realisations.jsx`. Chaque entrée porte son descriptif
(`description`) et sa photo de présentation (`image`), à déposer dans
`public/realisations/`.

Sans photo, la carte affiche automatiquement un aperçu filaire généré aux
couleurs du projet — aucune image cassée.

Formats et procédure détaillés : [`docs/realisations.md`](docs/realisations.md).

## 🎬 Film de présentation (motion design)

`public/motion.html` est un film animé d'environ 43 secondes (GSAP), aux couleurs
du site : la température monte de 12° à 99° de la recherche Google jusqu'à la
demande de devis. Il est servi tel quel à l'adresse `/motion.html`.

- `/motion.html?format=16x9` : paysage 1920×1080 (site, YouTube, LinkedIn)
- `/motion.html?format=9x16` : vertical 1080×1920 (TikTok, Reels, Shorts)
- Espace = pause / lecture · R = rejouer

Les textes sont dans le HTML, les temps de chaque scène dans l'objet `AT` du script.

La version vidéo avec voix off est dans `public/film/` et s'affiche dans la section
« Le film », juste après l'accueil (`src/components/Film.jsx`) : format vertical sur
téléphone, paysage ailleurs. Texte de la voix off et détails : [`docs/film.md`](docs/film.md).

## 📬 Activer le formulaire de contact

Dans `src/components/Contact.jsx`, dans la fonction `handleSubmit`, décommente et adapte
le bloc Formspree :

```js
const handleSubmit = async (e) => {
  e.preventDefault()
  const res = await fetch('https://formspree.io/f/TON_ID', {
    method: 'POST',
    body: new FormData(e.target),
    headers: { 'Accept': 'application/json' }
  })
  if (res.ok) {
    setStatus('sent')
    setTimeout(() => { setStatus('idle'); e.target.reset() }, 2400)
  }
}
```

Crée ton endpoint sur [formspree.io](https://formspree.io) (gratuit).

## 🌐 Déploiement

### Netlify (recommandé)

1. Push ton projet sur GitHub
2. Sur [netlify.com](https://netlify.com) : "Add new site" → "Import existing project"
3. Build command : `npm run build`
4. Publish directory : `dist`

### Vercel

```bash
npm i -g vercel
vercel
```

### GitHub Pages (avec vite-plugin)

Voir docs Vite : https://vitejs.dev/guide/static-deploy.html

## ⚡ Optimisations possibles

- Migrer vers TypeScript (`.tsx`)
- Lazy-load Three.js (`React.lazy`) pour réduire le bundle initial
- Ajouter un router (React Router) si tu veux des pages séparées
- PWA avec `vite-plugin-pwa`
- Animations Motion / Framer Motion à la place de GSAP

## 📄 Licence

© 2026 LTNS° — Tous droits réservés
