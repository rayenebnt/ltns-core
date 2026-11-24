# Référencement Google (SEO) de ltns.fr

Travail fait le 19 octobre 2026, puis le 24 novembre 2026 (pages pour les recherches « pas cher »), sur la branche `claude/quirky-keller-alpr2m`. Le site en ligne ne change qu'une fois cette branche fusionnée dans `main`. Le fonctionnement technique est décrit dans le README.

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

## 24 novembre 2026 : des pages pour chaque recherche

Une page ne peut sortir sur Google que pour ce dont elle parle vraiment. Avant, aucune page ne parlait de « site pas cher », d'application mobile, de boutique en ligne ou de refonte. Quatre pages ont été ajoutées, chacune pour une famille de recherches :

| Page | Recherches visées |
|---|---|
| `/site-internet-pas-cher` | site internet pas cher, site web pas cher, prix d'un site internet, combien coûte un site |
| `/creation-application-mobile` | application mobile pas chère, création d'application, prix d'une application iPhone / Android |
| `/boutique-en-ligne` | boutique en ligne, site e-commerce, prix d'une boutique en ligne |
| `/refonte-site-internet` | refonte de site, refaire / moderniser son site (exemple réel : Swatter TV) |

- Chaque page a son titre, sa description, son fil d'Ariane, ses questions fréquentes et sa fiche « Service » pour Google. Elle a aussi son formulaire de devis, avec le bon type de projet déjà coché.
- Les prix viennent tous de `src/data/formules.js`. Une application, une boutique et une refonte restent **sur devis** : aucune fourchette n'est inventée.
- Les pages se renvoient les unes aux autres :
  - depuis la section Services de l'accueil ;
  - depuis la FAQ (« Combien coûte un site internet ? » mène à la page « pas cher ») ;
  - depuis les pages site vitrine et logiciel ;
  - depuis une nouvelle colonne du pied de page.

  Ces liens aident Google à comprendre de quoi parle chaque page.
- « Peu importe l'endroit » : il n'y a **pas de page par ville**. Google sanctionne ces pages copiées-collées. Ce sont les pages nationales qui disent « partout en France à distance ». La page « pas cher » cite aussi une fois Paris et les 7 autres départements d'Île-de-France, où tu te déplaces. Pour le local, c'est la fiche Google qui compte (voir plus bas).
- **À relire et à me confirmer** (écrit d'après ce que le site dit déjà, rien d'autre) :
  - les exemples d'usages d'une application et les fonctions d'une boutique : ce sont des exemples, pas des réalisations ;
  - sur la page refonte, la phrase « les anciennes adresses de vos pages sont redirigées vers les nouvelles » ;
  - si tu as un prix de départ pour une application (« à partir de … € »), donne-le-moi : c'est ce que cherchent les gens qui tapent « application mobile pas chère ». Il ira dans `formules.js`, comme les autres prix.

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
| `SITE.sameAs.googleMaps` | ✅ Rempli le 20 octobre (fiche validée) |
| `SITE.analytics.vercel` | `false` si Vercel Web Analytics n'est pas activé |

Si tu fais des visios, le mot peut être rajouté dans la FAQ et sur la page site vitrine. Il a été retiré parce que ce n'était pas confirmé.

## Mise en ligne

1. Fusionner la branche dans `main` : Vercel déploie tout seul. `vercel.json` impose déjà la commande `npm run build`.
2. Dans Vercel, vérifier qu'aucune « Build Command » personnalisée (`vite build`) n'est forcée dans **Settings → Build & Output**. Sinon, les pages ne seraient pas pré-écrites.
3. Dans **Settings → Domains**, mettre `ltns.fr` en domaine principal, avec `www.ltns.fr` redirigé vers `ltns.fr`.
4. Ouvrir `https://ltns.fr/creation-site-vitrine`, `https://ltns.fr/sitemap.xml` et une adresse qui n'existe pas (elle doit afficher la page 404).

## À faire de ton côté, par ordre d'importance

Le site est prêt. La suite se joue en dehors du site : c'est là que Google, Bing, Maps, TikTok et les assistants comme ChatGPT trouvent la preuve que LTNS° existe et travaille bien.

1. **Mettre en ligne** : fusionner la branche dans `main` (voir « Mise en ligne »).
2. **Google Search Console** (search.google.com/search-console) :
   - ajoute une propriété « Domaine » `ltns.fr`, validée par un enregistrement DNS chez ton registraire ;
   - envoie le plan du site `https://ltns.fr/sitemap.xml` ;
   - dans « Inspection de l'URL », demande l'indexation des 8 pages : `/`, `/creation-site-vitrine`, `/site-internet-pas-cher`, `/refonte-site-internet`, `/boutique-en-ligne`, `/logiciel-sur-mesure`, `/creation-application-mobile`, `/realisations/pmsb`.
3. **Fiche Google** (c'est elle qui sort sur Maps et dans les résultats « près de moi ») :
   - le site `https://ltns.fr`, exactement les mêmes nom et téléphone que sur le site (voir `FICHE-GOOGLE.md`) ;
   - **Services** : ajoute « Création de site internet », « Refonte de site internet », « Boutique en ligne », « Application mobile » et « Logiciel de gestion sur mesure ». Mets dans chacun une phrase reprise de la page qui correspond ;
   - **Zone desservie** : Paris et les 7 autres départements d'Île-de-France, là où tu te déplaces vraiment ;
   - **Actualités** : une publication par semaine. Par exemple, une capture de réalisation ou un conseil tiré d'une page, avec le bouton « En savoir plus » vers cette page ;
   - des photos de tes réalisations.
4. **Avis Google de vrais clients** (PMSB, RBTI, Swatter TV s'ils sont d'accord), avec le message neutre de `FICHE-GOOGLE.md`. Pas de cadeau, pas de texte proposé. Les avis comptent beaucoup pour Maps.
5. **Un lien depuis les sites de tes clients** : demande à PMSB, RBTI et Swatter TV d'ajouter « Site réalisé par LTNS° » en bas de leur site, avec un lien vers `https://ltns.fr`. C'est un des signaux les plus forts pour Google.
6. **Bing Webmaster Tools** (bing.com/webmasters) : « Importer depuis Google Search Console », puis envoyer le plan du site. Bing alimente aussi DuckDuckGo, Ecosia, Yahoo, et en partie Copilot et la recherche de ChatGPT. Dans **Bing Places**, importe la fiche Google.
7. **Apple Business Connect** (businessconnect.apple.com) : une fiche gratuite pour sortir dans Plans et Siri sur iPhone. Utilise les mêmes nom, téléphone et site.
8. **TikTok, YouTube** : ta série « Les sites internet en 2026 » est ta meilleure vitrine. TikTok sert de moteur de recherche à beaucoup de gens.
   - Écris les mots que les gens cherchent dans la légende et sur l'écran : « site internet pas cher », « créer son site », « application mobile ».
   - Mets `https://ltns.fr` dans la bio dès que TikTok le permet, et envoie-moi le lien du compte : il ira dans `src/data/site.js`.
   - Publie les mêmes vidéos en Shorts sur YouTube, avec dans la description une phrase et le lien de la page qui correspond. YouTube appartient à Google, et ses vidéos sortent dans les résultats.
9. **Inscriptions gratuites et sérieuses**, avec exactement les mêmes nom, téléphone et site : PagesJaunes, Malt, Codeur.com, une page entreprise LinkedIn. Envoie-moi les liens pour que je les ajoute au site. Les assistants comme ChatGPT s'appuient sur ces sites pour recommander une entreprise.
10. **Tester les pages en ligne** :
    - search.google.com/test/rich-results et validator.schema.org pour les fiches d'identité. Les avertissements sur l'adresse sont normaux, puisqu'elle est masquée ;
    - pagespeed.web.dev pour la vitesse.
11. **Une fois par mois** : Search Console → Performances. Regarde les recherches qui t'amènent des visites, et dis-moi celles qui reviennent souvent sans clic : on améliore la page qui y répond.

**Pour être visible tout de suite**, la seule solution est payante : Google Ads. Tu choisis les recherches, la zone et le budget maximum, et tu envoies les visiteurs vers `/site-internet-pas-cher`. Le référencement naturel, lui, est gratuit mais prend plusieurs mois.

## À éviter

Ces pratiques font baisser le site ou le font sanctionner par Google :
- acheter des liens ou des « packs d'annuaires » ;
- les faux avis, ou les avis contre un cadeau ;
- ajouter des mots-clés dans le nom de la fiche Google ;
- créer une page par ville ;
- promettre une position sur Google.

## À savoir

Google met en général plusieurs semaines à prendre en compte une nouvelle page. Sur « site internet pas cher » ou « création site internet » au niveau national, la concurrence est très forte : de grandes plateformes, des agences et des comparateurs. Personne ne peut garantir une position. Les nouvelles pages sortiront d'abord sur des recherches plus précises, comme « site vitrine 490 € », « refonte site internet prix » ou « site internet artisan pas cher ». Elles monteront ensuite avec les avis, les liens venant d'autres sites et l'ancienneté. Le site est prêt techniquement : la suite se joue en dehors du site.
