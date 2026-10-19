# LTNS° — Site React

> Le web au bon degré.

Site de présentation pour activité freelance de création de sites internet :
l'accueil, des pages de service, une étude de cas et les mentions légales.
Version **React + Vite**, pré-rendue en HTML statique au build.

## 🚀 Stack

- **React 18** — composants réutilisables, hooks
- **Vite** — build ultra rapide, HMR instantané
- **Three.js** — scène 3D de la visite guidée (chargée à la demande)
- **GSAP** — animations (lancées au scroll par IntersectionObserver)
- **CSS pur** (variables CSS, Grid, Flexbox)
- **Polices servies par le site** (`public/fonts`) : Space Grotesk · Inter Tight · JetBrains Mono

## 📁 Structure

```
ltns-react/
├── index.html              # Point d'entrée HTML (Vite), modèle des pages pré-rendues
├── package.json
├── vite.config.js
├── vercel.json             # Adresses, redirection, cache (Vercel)
├── scripts/
│   ├── prerender.mjs       # Pré-rendu et contrôles SEO du build
│   └── check-hydration.mjs # npm run check:hydration
├── public/                 # Fichiers statiques
│   └── realisations/       # Photos de présentation des projets
└── src/
    ├── main.jsx            # Bootstrap React (reprend le HTML pré-rendu)
    ├── entry-server.jsx    # Rendu des pages pour le pré-rendu
    ├── App.jsx             # Coquille commune à toutes les pages
    ├── routes.jsx          # Table des pages : contenu, titre, description…
    ├── data/               # site.js (infos du propriétaire), formules.js (prix), faq.js, steps.js
    ├── pages/              # Une page par fichier (Home, CreationSiteVitrine, NotFound…)
    ├── seo/                # <head> et JSON-LD de chaque page
    ├── components/
    │   ├── page/           # Blocs des pages intérieures (PageHero, PageSection…)
    │   ├── Loader.jsx
    │   ├── Cursor.jsx      # Curseur custom néon
    │   ├── Nav.jsx
    │   ├── Hero.jsx        # Titre + readout, animation GSAP
    │   ├── Parcours.jsx    # Visite guidée de A à Z, scène Three.js plein écran
    │   ├── ParcoursTrigger.jsx  # Accès à la visite guidée : hero, nav, bandeau, pastille
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

### Coordonnées et mentions légales

Tout est dans `src/data/site.js` (email, téléphone, zone, liens, mentions légales) :
voir « SEO, pages et build » plus bas.

### Tarifs

Section placée juste après l'accueil, au-dessus du devis. Les formules (prix, contenu,
délai, public) sont dans le tableau `FORMULES` de `src/data/formules.js`, seul endroit
où écrire un prix.

- **Essentiel / Pro** (formules avec un prix) : le bouton ouvre une demande directe.
  Le visiteur laisse seulement nom, email, téléphone et activité (facultatifs pour les
  deux derniers). La demande part sur le même Formspree que le devis (`FORMSPREE_URL`
  dans `Contact.jsx`), donc à la même adresse email, avec la formule, le prix, une
  référence et l'objet « Formule Pro — Nom ».
- **Sur-mesure** (`price: null`, affiché « Sur devis ») : le bouton mène au devis
  détaillé, avec la formule pré-remplie.

Motion design (GSAP) : les cartes montent, la jauge de chauffe
s'allume segment par segment, température et prix défilent, le badge « recommandé »
se tamponne, puis la formule Pro garde une bordure qui tourne. La demande
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

Services : tableau `services` en haut de `src/components/Services.jsx`. FAQ de
l'accueil : `src/data/faq.js`. Étapes d'un projet : `src/data/steps.js`.

### Réalisations

Les projets sont listés dans le tableau `projects` en haut de
`src/components/Realisations.jsx`. Chaque entrée porte son descriptif
(`description`) et sa photo de présentation (`img`), à déposer dans
`public/realisations/`.

Sans photo, la carte affiche automatiquement un aperçu filaire généré aux
couleurs du projet — aucune image cassée.

Formats et procédure détaillés : [`docs/realisations.md`](docs/realisations.md).

## 🎬 Film de présentation (motion design)

`public/motion.html` est un film animé d'environ 43 secondes (GSAP), aux couleurs
du site : la température monte de 12° à 99° de la recherche Google jusqu'à la
demande de devis. Il est servi tel quel à l'adresse `/motion` (hors de Google,
comme `/affiche` et `/logo`).

- `/motion?format=16x9` : paysage 1920×1080 (site, YouTube, LinkedIn)
- `/motion?format=9x16` : vertical 1080×1920 (TikTok, Reels, Shorts)
- Espace = pause / lecture · R = rejouer

Les textes sont dans le HTML, les temps de chaque scène dans l'objet `AT` du script.

La version vidéo avec voix off est dans `public/film/` et s'affiche dans la section
« Le film », juste après l'accueil (`src/components/Film.jsx`) : format vertical sur
téléphone, paysage ailleurs. Texte de la voix off et détails : [`docs/film.md`](docs/film.md).

## 🔎 SEO, pages et build

**Le build** (`npm run build`, en Node pur, sur Vercel comme en local) :
1. `vite build` : le site pour le navigateur, dans `dist/` ;
2. `vite build --ssr src/entry-server.jsx --outDir .ssr` : le même site, pour Node ;
3. `node scripts/prerender.mjs` : une page HTML complète par adresse de `src/routes.jsx`
   (contenu, titre, description, canonical, aperçu de partage, JSON-LD), puis `404.html`,
   `sitemap.xml` et `robots.txt`. Il contrôle chaque page (un seul titre, une description,
   un h1, longueurs, canonical, données structurées, formulations, liens et ancres) : à la
   moindre erreur, le build échoue et le site déjà en ligne reste en place.

`dist/` contient alors `index.html`, `creation-site-vitrine.html`, `logiciel-sur-mesure.html`,
`realisations/pmsb.html`, `mentions-legales.html`, `404.html`, le sitemap, le robots.txt,
`assets/` et les fichiers de `public/`.

**Ajouter une page**
1. Une entrée dans `ROUTES` (`src/routes.jsx`) : titre (60 signes au plus), description
   (70 à 155), `updated`, `sections` (ancres de l'accueil présentes sur la page, ex.
   `['contact']`), fil d'Ariane, données structurées. Le commentaire en tête du fichier
   décrit chaque champ.
2. Le composant dans `src/pages/`, avec les blocs de `src/components/page/` : `PageHero`
   porte le seul `<h1>`, `PageSection` les `<h2>`. Les textes passés à ces blocs (et à
   `FaqList`, `StepsList`, `CtaBand`) reçoivent les espaces insécables avant `: ; ? !`
   (`src/lib/typo.js`) ; dans le texte écrit en JSX, mettre `&nbsp;` soi-même.
3. Des liens vers la page : pied de page (`src/components/Footer.jsx`) et une page voisine.
4. Changer `updated` seulement quand le contenu change vraiment (c'est la date du sitemap).

**Règle du rendu serveur** : pendant le rendu d'un composant, ne jamais lire `window`,
`document`, `localStorage`, `matchMedia`, `Date` ou `Math.random` ; ces lectures vont dans
un `useEffect`. `npm run build && npm run check:hydration` reprend chaque page de `dist/`
(bureau et téléphone) et échoue au moindre écart entre le HTML et le navigateur.

**`src/data/site.js`** est le seul endroit pour le nom, le téléphone, l'email, les liens
(TikTok, fiche Google) et les mentions légales. Une valeur `TODO` s'affiche
« [à compléter] » ; tant qu'il en reste une dans `LEGAL`, `/mentions-legales` reste hors
de Google, puis devient indexable d'elle-même au build suivant.

**`vercel.json`** : commande de build (`npm run build`) et dossier publié (`dist`),
adresses sans `.html` ni `/` final, aucune réécriture (une adresse inconnue reçoit
`404.html` avec le code 404), `/realisations` redirige vers `/#realisations`, cache
long pour `/assets` et `/fonts`.

**Règles de contenu** (le build en vérifie une partie) : aucun avis ni note, ni balisage
d'avis dans les données structurées ; aucune promesse de position sur Google ; aucun
chiffre ni témoignage inventé ; les prix viennent uniquement de `src/data/formules.js` ;
pas de pages par ville.

Captures des réalisations (formats, variantes AVIF/WebP) : [`docs/realisations.md`](docs/realisations.md).

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

Le site est déployé par **Vercel** à chaque mise à jour de la branche `main`
(build : `npm run build`, dossier publié : `dist`). Ces deux réglages sont écrits dans
`vercel.json` et passent avant ceux du tableau de bord Vercel : un simple `vite build`
publierait un site sans titres, sans pages intérieures, sans 404 ni sitemap, et sans
aucun des contrôles du build. Les adresses propres, la page 404, la redirection et le
cache viennent aussi de `vercel.json` : un autre hébergeur ne les appliquerait pas.

## ⚡ Optimisations possibles

- Migrer vers TypeScript (`.tsx`)
- PWA avec `vite-plugin-pwa`
- Animations Motion / Framer Motion à la place de GSAP

## 📄 Licence

© 2026 LTNS° — Tous droits réservés
