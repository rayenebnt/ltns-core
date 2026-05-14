# LTNS° — Site React

> Le web au bon degré.

Site one-page de présentation pour activité freelance de création de sites internet.
Version **React + Vite**.

## 🚀 Stack

- **React 18** — composants réutilisables, hooks
- **Vite** — build ultra rapide, HMR instantané
- **Three.js** — scène 3D du hero
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
└── src/
    ├── main.jsx            # Bootstrap React
    ├── App.jsx             # Composant racine
    ├── components/
    │   ├── Loader.jsx
    │   ├── Cursor.jsx      # Curseur custom néon
    │   ├── Nav.jsx
    │   ├── Hero.jsx        # Scène Three.js + animation GSAP
    │   ├── Pourquoi.jsx
    │   ├── Services.jsx    # Cards avec tilt 3D
    │   ├── Process.jsx
    │   ├── Tarifs.jsx
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

Dans `src/components/Tarifs.jsx`, modifie directement les valeurs `490`, `990`.

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
