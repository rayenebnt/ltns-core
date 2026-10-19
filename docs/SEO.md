# Référencement Google (SEO) de ltns.fr

Travail fait le 19 octobre 2026, sur la branche `claude/quirky-keller-alpr2m`. Le site en ligne ne change qu'une fois cette branche fusionnée dans `main`. Le fonctionnement technique est décrit dans le README.

## Résultats mesurés

Mesures Lighthouse (l'outil de Google), médiane de 3 passages, avant et après le travail :

| Accueil | Avant | Après |
|---|---|---|
| Vitesse sur mobile | 0,63 | **0,96** |
| Affichage du contenu principal sur mobile | 4,1 s | **2,3 s** |
| Vitesse sur ordinateur | 0,98 | **1,00** |
| SEO (Lighthouse) | 1,00 | 1,00 |
| Accessibilité | 0,92 | **0,96** |

La page `/creation-site-vitrine` obtient 0,97 sur mobile.

## Ce qui a changé

- **Google reçoit toutes les pages déjà écrites en HTML.** Avant, il recevait une page vide et devait exécuter le JavaScript pour voir le texte.
- **Chaque page a son titre, sa description et sa fiche d'identité** pour Google (données structurées « LocalBusiness », zone servie France + Île-de-France, sans adresse ni faux avis).
- **Plan du site** (`/sitemap.xml`), **`robots.txt`**, image de partage, icônes PNG et vraie page 404.
- **Nouvelles pages :**
  - `/creation-site-vitrine`
  - `/logiciel-sur-mesure`
  - `/realisations/pmsb`
  - `/mentions-legales` : invisible pour Google tant qu'elle n'est pas complète
- **Accueil :**
  - « Création de site internet partout en France » ;
  - le déplacement chez le client en Île-de-France ;
  - « RECOMMANDÉ » au lieu de « LE PLUS CHOISI » ;
  - « Référencement Google plus poussé » au lieu de « Mieux placé sur Google ».

  Le design reste le même.
- **Vitesse :**
  - polices servies par le site ;
  - images AVIF/WebP ;
  - animations moins gourmandes ;
  - three.js allégé.
- **Pages techniques cachées à Google :** `/affiche`, `/logo`, `/motion`.

Le build vérifie lui-même tout cela à chaque déploiement : titres, descriptions, liens, plan du site et absence de faux avis. Si un contrôle échoue, le déploiement s'arrête et l'ancienne version reste en ligne.

## À compléter (fichier `src/data/site.js`)

Tant que ces champs valent `[à compléter]`, la page des mentions légales l'affiche tel quel et reste cachée à Google.

| Champ | Quoi |
|---|---|
| `LEGAL.lastName` | Ton nom de famille |
| `LEGAL.legalForm`, `LEGAL.siret` | Statut (par exemple « Entrepreneur individuel (EI) ») et SIRET, à trouver sur annuaire-entreprises.data.gouv.fr |
| `LEGAL.address` | Adresse à publier (obligatoire pour l'éditeur du site) |
| `LEGAL.vat` | Numéro de TVA, ou « TVA non applicable, art. 293 B du CGI » |
| `LEGAL.host.address`, `LEGAL.host.phone` | Adresse et téléphone de Vercel Inc., à copier sur vercel.com/legal |
| `LEGAL.mediator` | Médiateur de la consommation (obligatoire si tu vends à des particuliers) |
| `LEGAL.retention` | Durée de conservation des demandes de devis, par exemple « 3 ans après notre dernier échange » |
| `LEGAL.transfers` | Garanties pour les données envoyées hors de l'UE (Formspree, Google, Vercel, Umami) |
| `SITE.sameAs.tiktok` | Le lien de ton compte TikTok |
| `SITE.sameAs.googleMaps` | Le lien de la fiche Google, une fois validée |
| `SITE.analytics.vercel` | `false` si Vercel Web Analytics n'est pas activé |

Si tu fais des visios, le mot peut être rajouté dans la FAQ et sur la page site vitrine. Il a été retiré parce que ce n'était pas confirmé.

## Mise en ligne

1. Fusionner la branche dans `main` : Vercel déploie tout seul. `vercel.json` impose déjà la commande `npm run build`.
2. Dans Vercel, vérifier qu'aucune « Build Command » personnalisée (`vite build`) n'est forcée dans **Settings → Build & Output**. Sinon, les pages ne seraient pas pré-écrites.
3. Dans **Settings → Domains**, mettre `ltns.fr` en domaine principal, avec `www.ltns.fr` redirigé vers `ltns.fr`.
4. Ouvrir `https://ltns.fr/creation-site-vitrine`, `https://ltns.fr/sitemap.xml` et une adresse qui n'existe pas (elle doit afficher la page 404).

## À faire de ton côté, par ordre d'importance

1. **Google Search Console** (search.google.com/search-console) :
   - ajoute une propriété « Domaine » `ltns.fr`, validée par un enregistrement DNS chez ton registraire ;
   - envoie le plan du site `https://ltns.fr/sitemap.xml` ;
   - dans « Inspection de l'URL », demande l'indexation des 4 pages : `/`, `/creation-site-vitrine`, `/logiciel-sur-mesure`, `/realisations/pmsb`.
2. **Fiche Google :** site `https://ltns.fr`, exactement les mêmes nom et téléphone que sur le site (voir `FICHE-GOOGLE.md`).
3. **Avis Google de vrais clients** (PMSB, puis RBTI s'il est d'accord), avec le message neutre de `FICHE-GOOGLE.md`. Pas de cadeau, pas de texte proposé.
4. **Un lien depuis les sites de tes clients :** demande à PMSB d'ajouter « Site réalisé par LTNS° » avec un lien vers `https://ltns.fr` en bas de pmsbbatiment.fr. Fais pareil avec RBTI s'il est d'accord. C'est un des signaux les plus forts pour Google.
5. **`https://ltns.fr` dans la bio TikTok.**
6. **Bing Webmaster Tools :** « Importer depuis Google Search Console ».
7. **Inscriptions gratuites et sérieuses**, avec exactement les mêmes nom, téléphone et site : PagesJaunes, Malt, Codeur.com, une page entreprise LinkedIn. Envoie-moi les liens pour que je les ajoute au site.
8. **Tester les pages en ligne :**
   - search.google.com/test/rich-results et validator.schema.org pour les fiches d'identité. Les avertissements sur l'adresse sont normaux, puisqu'elle est masquée.
   - pagespeed.web.dev pour la vitesse.
9. **Une fois par mois :** Search Console → Performances. Regarde les recherches qui t'amènent des visites.

## À éviter

Ces pratiques font baisser le site ou le font sanctionner par Google :
- acheter des liens ou des « packs d'annuaires » ;
- les faux avis, ou les avis contre un cadeau ;
- ajouter des mots-clés dans le nom de la fiche Google ;
- créer une page par ville ;
- promettre une position sur Google.

## À savoir

Google met en général plusieurs semaines à prendre en compte un site après ces changements. Sur « création site internet » au niveau national, la concurrence est forte. Le classement dépend ensuite surtout des avis, des liens venant d'autres sites et de l'ancienneté. Le site est maintenant prêt techniquement : la suite se joue en dehors du site.
