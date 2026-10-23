# Vidéo 4 · Vrai projet PMSB Gestion : « Ses devis ? À la main. J'ai créé ça. »

TikTok 1080 × 1920, 30 i/s. Le brouillon sans voix dure 22,2 s avec le minutage estimé du moteur. Avec la vraie voix, il devrait faire environ 19,6 s. Concept validé : `../concepts.json`, `final.videos[n=4]`.

Tout ce qui est à l'écran vient du **vrai logiciel PMSB Gestion**, lancé en local sur la **base de démonstration**. Les clients, les prix, les montants et les coordonnées y sont inventés. On voit :
- le vrai PDF généré par l'appli ;
- l'éditeur de devis capturé geste par geste ;
- le tableau de bord, l'échéancier et la version téléphone.

Le montage ajoute :
- les poses 3D, la caméra et les reflets ;
- l'ordinateur et le téléphone vectoriels, le curseur ;
- les lettres géantes, le compteur et les contours ;
- les sous-titres et la carte de fin.

Le badge « Données de démonstration » reste à l'écran du début à la fin. Il est collé sur la feuille à l'image 0, puis ancré en haut à gauche.

## Ce qu'on voit

| Moment (calé sur la voix) | À l'écran | Source réelle |
|---|---|---|
| Image 0 → 3 s | Fond graphite, tableau de bord de démo très flouté. Page 1 du devis DEV-2026-0002 posée en 3D (rotateY −12°, rotateX 8°). Titre fixe « Ses devis ? À la main. / J'ai créé ça. », avec « ça » en bleu. Le reflet balaie la feuille dès 0,1 s, la caméra pousse de 1,00 à 1,04 et la feuille tourne doucement. Les mots du titre s'allument au rythme de la voix, les soulignés rouges scintillent, « à la main » se souligne au feutre rouge et « ça » pulse. Ensuite, la caméra descend le long des lignes 4 à 6, puis fait une macro sur « Devis N°DEV-2026-0002 » et le filigrane pendant que le tableau de bord devient net. | `assets/devis-0002-p1.jpg`, `tableau-de-bord*.jpg` |
| V3 « Son logiciel : il tape quatre lettres… » | Étiquette « VRAI PROJET · PMSB GESTION ». La feuille se dé-imprime de bas en haut et rentre dans un ordinateur qui s'allume sur l'éditeur, et les modules de la barre latérale s'allument un par un. Clic dans « Ajouter depuis la bibliothèque… » : la liste jaillit. Les lettres « p e i n » arrivent en géant, puis rentrent dans le champ, et la liste se filtre à chaque lettre. Clic sur « Peinture de façade pliolite, 2 couches » : la ligne tombe dans le tableau avec un rebond et un contour vert. Un travelling suit la ligne, puis la macro passe sur Qté / Unité / PU HT / TVA, avec l'étiquette « prix de démo ». | `assets/e00…e07.jpg` (une capture par geste) |
| V4 « Le total se recalcule tout seul. » | Quantité 1 → 2 → 26 → 260. Le total de la ligne et le compteur « TOTAL TTC » suivent les **vraies valeurs de l'appli** à chaque frappe : 18 766,40 → 18 796,27 → 19 513,30 → 26 504,28 €. Le compteur porte l'étiquette « montants de démonstration ». Ensuite, la carte Montants et la barre fixe s'entourent. | `e08…e11.jpg`, `rects.json` (totaux relevés dans la page) |
| V5 « Un clic, et le devis sort en PDF, à son en-tête. » | Le curseur clique sur « Enregistrer et voir le PDF » : onde, flash, puis « Devis enregistré. ». Les lignes s'envolent de l'écran vers la feuille A4, qui s'imprime de haut en bas dans la pose de l'image 0. C'est le PDF que l'appli a généré pour ce devis, DEV-2026-0013. Travelling sur l'en-tête « ENTREPRISE P.M.S.B / Prestations Multi Services Bâtiment ». La page 2 glisse à côté avec les totaux, et la case « Bon pour accord » est entourée au feutre. | `e12, e13.jpg`, `devis-0013-p1.jpg`, `devis-0013-p2.jpg` |
| V6 « Livré en quatre semaines. » | « LIVRÉ EN 4 SEMAINES », avec quatre cases S1 à S4 qui se remplissent. | (montage) |
| Pause longue | Trois coupes : tableau de bord sur téléphone, échéancier, menu du téléphone où la pastille rouge « 2 » rebondit. | `m01.jpg`, `echeancier.jpg`, `m02.jpg` |
| V7 « Et toi, tes devis, tu les fais comment ? » | La question en gros, avec « comment » surligné, sur la feuille floutée qui tourne lentement et qu'un reflet traverse. Ensuite : « Logiciel sur mesure · sur devis » et « Devis gratuit sous 48 h · lien en bio » (+0,7 s), « Partout en France à distance / sur place en Île-de-France » (+1,3 s), puis « LTNS° » (+1,9 s). | `devis-0013-p1.jpg` |
| Boucle (1 s) | DEV-2026-0002 se réimprime de haut en bas et reprend exactement la pose 3D de l'image 0. Le badge se recolle sur la feuille et le titre revient : la dernière image est l'image 0. | `devis-0002-p1.jpg` |

**D'où vient le devis édité.** Le devis DEV-2026-0013 a été préparé hors caméra, dans l'appli : le bouton « Dupliquer » a copié DEV-2026-0002, puis on n'a gardé que les lots 1 et 2, sans la ligne pliolite. La ligne ajoutée à l'écran arrive donc à sa place, à la fin du lot 2 « Ravalement ». Le PDF imprimé est celui de ce devis.

**Ce qui n'est jamais lisible ni montré** :
- sur les PDF, l'adresse, les téléphones et l'e-mail de l'en-tête, ainsi que l'adresse, le SIRET et la TVA du client, même fictifs (floutés par `build-assets.py`) ;
- le pied de page « SARL PMSB au capital… », recadré ;
- les numéros de téléphone du tableau de bord, de l'échéancier et du téléphone, floutés ;
- l'écran Paramètres, la carte « Contrat et documents du chantier », le domaine de production, les vrais noms, le dépôt et le `.env`.

Le compte affiché est le compte de démo « Alex Démo ». La vidéo ne dit nulle part que le devis est « envoyé » et n'annonce aucun gain de temps ni aucun chiffre réel.

## Régénérer les captures

Il faut une copie de travail de l'appli, sans `.git` ni `.env` (le dépôt `/home/user/pmsb-gestion` n'est jamais modifié). Il faut aussi une base PostgreSQL 16 locale à soi, remplie avec le jeu de démo `scripts/demo-seed.ts`, écrit pendant la phase d'exploration.

```bash
W=/chemin/de/travail; mkdir -p $W/app
cd /home/user/pmsb-gestion && tar --exclude=.git --exclude=.env -cf - . | tar -xf - -C $W/app
cp /home/user/ltns-core/video/vrais-sites/v04-pmsb-gestion-devis/scripts/demo-seed.ts $W/app/demo/seed.ts
cd $W/app && npm ci
# Base de démo (root ne peut pas lancer postgres : on passe par l'utilisateur postgres)
su postgres -s /bin/bash -c "/usr/lib/postgresql/16/bin/initdb -D /var/lib/postgresql/pmsb-demo-v04 -U postgres -A trust -E UTF8 --locale=C.UTF-8"
su postgres -s /bin/bash -c "/usr/lib/postgresql/16/bin/pg_ctl -D /var/lib/postgresql/pmsb-demo-v04 -o '-p 55434 -k /tmp -c listen_addresses=127.0.0.1' -l /var/lib/postgresql/pmsb-demo-v04/server.log start"
psql -h 127.0.0.1 -p 55434 -U postgres -c 'create database pmsb_demo;'
export DATABASE_URL="postgresql://postgres@127.0.0.1:55434/pmsb_demo" SESSION_SECRET="$(head -c 48 /dev/urandom | base64)"
npx prisma migrate deploy && NEXT_TELEMETRY_DISABLED=1 npx next build
./node_modules/.bin/next start -p 3424 -H 127.0.0.1 &        # noter le PID pour l'arrêter ensuite
# Captures (la base est remise à zéro par le jeu de démo, puis DEV-2026-0002 est dupliqué en DEV-2026-0013)
cd /home/user/ltns-core/video/vrais-sites/v04-pmsb-gestion-devis/scripts
PMSB_GESTION_APP=$W/app node capture-app.mjs $W/captures
python3 -I build-assets.py $W/captures ../assets
# Arrêt : kill <PID de next-server> ; su postgres -s /bin/bash -c "/usr/lib/postgresql/16/bin/pg_ctl -D /var/lib/postgresql/pmsb-demo-v04 stop -m fast"
```

`capture-app.mjs` produit :
- les états de l'éditeur, une capture PNG 2880 × 1800 (1440 × 900 en DPR 2) par geste ;
- les deux PDF générés par l'appli, récupérés depuis la page connectée ;
- le tableau de bord, l'échéancier et le téléphone (390 × 844 en DPR 3) ;
- `rects.json` : les rectangles des éléments, les totaux affichés et les numéros à flouter.

`build-assets.py` :
- rastérise les PDF à 300 dpi et floute les coordonnées repérées par `pdftotext -bbox` ;
- recadre le pied de page ;
- exporte les JPEG et la position des textes du PDF, qui servent de repères à la caméra.

Les jours de retard de l'échéancier dépendent de la date du jour.

## Voix et rendu

La voix n'est pas encore enregistrée : le brouillon utilise le minutage estimé du moteur. Il y a 7 phrases, une par segment `[pause]` / `[long pause]` du script, et P.M.S.B. est lu lettre par lettre. Quand `voice/01.mp3` … `07.mp3` existent :

```bash
cd /home/user/ltns-core
python3 video/commun/sync-voice.py video/vrais-sites/v04-pmsb-gestion-devis     # timing.json, voice.mp3, voice-files.js
node video/commun/render.mjs video/vrais-sites/v04-pmsb-gestion-devis
```

Tous les temps forts après 3 s sont accrochés à des mots (`CUES`), donc la vidéo se recale seule :
- les trois coupes occupent la pause longue entre V6 et V7, sur 0,9 s au moins ;
- la carte de fin démarre avec V7 ;
- la boucle commence 0,9 s après la dernière phrase.

Contrôle : `node scripts/planche.mjs /tmp/planche.png` (vignettes 0, 0,5, 1, 1,5, 2, 2,5, 3, 4 … fin). Le serveur local doit tourner sur le port 8765.

Note technique : de près, l'ordinateur passe en transformation 2D. Avec la perspective, Chromium rastérise l'écran en basse définition puis l'agrandit.

## Légende et hashtags

Ses devis ? Avant, PMSB les faisait tous à la main. Je lui ai créé son logiciel : bibliothèque de prix, total recalculé tout seul, devis en PDF à son en-tête. Livré en 4 semaines. Données de démonstration à l'écran. Logiciel sur mesure, prix sur devis · partout en France à distance, sur place en Île-de-France · devis gratuit sous 48 h, lien en bio. #logicielsurmesure #devis #artisanbtp #ravalement #batiment #tpe

L'étiquette « contenu généré par IA » est activée (voix clonée), et la couverture est l'image 0.

Avant publication :
- l'accord écrit de PMSB doit exister (PLAN-30-JOURS.md l.24) ;
- si l'épisode 04 « Coulisses : PMSB Gestion » a déjà été publié, on remplace cette vidéo par R2.
