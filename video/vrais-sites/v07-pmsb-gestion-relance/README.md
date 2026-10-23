# Vidéo 7 · Vrai projet PMSB Gestion : « Facture impayée : qui écrit la relance ? »

TikTok 1080 × 1920, 30 i/s. Concept validé : `../concepts.json`, `final.videos[n=7]`.

Durée :
- brouillon muet, avec le minutage estimé du moteur : 24,6 s ;
- avec le calage voix du concept (V1 0,1-2,1 … V6 17,0-18,9) : 20,5 s, vérifié avec un `timing.json` provisoire, retiré ensuite.

Tout ce qui est à l'écran vient du **vrai logiciel PMSB Gestion**, lancé en local sur la **base de démonstration**. Les clients, les montants, les dates et « Alex Démo » sont inventés. Le badge jaune « Données de démonstration » reste visible de la première à la dernière image.

## Ce qu'on voit

| Moment (calé sur la voix) | À l'écran | Source réelle |
|---|---|---|
| Image 0 → 1 s | Titre fixe « FACTURE IMPAYÉE : / QUI ÉCRIT LA RELANCE ? », avec « IMPAYÉE » en rouge. Dessous, la vraie carte « Relances » de FAC-2026-0002 en 3D : « 3. Mise en demeure » coché et « Madame, Monsieur, Malgré nos relances restées sans effet, la… ». Badge démo collé sur la carte. Derrière, le tableau de bord flouté, où la carte « En retard » n'est plus qu'une tache rouge. Pendant la première seconde : onde bleue sur le choix 3 (ding à 0,1 s), reflet sur la carte, curseur de texte qui clignote, poussée 1,00 → 1,03, mots du titre qui s'allument, soulignés rouge puis bleu. | `panneau-n3.png`, `dash-flou.jpg` |
| 1 → 2 s | Bascule de mise au point : la carte se floute et recule, le tableau de bord devient net, la vraie carte « En retard » sort vers la caméra, avec le badge démo. | `dash.jpg`, `el-kpi-retard.png` |
| 2 → 3 s | Un ordinateur vectoriel monte, la carte « En retard » y reprend sa place. Zoom sur « Factures en retard » : la ligne FAC-2026-0002 s'entoure, le curseur survole puis clique sur « Relancer » (vrai état de survol). | `dash.jpg`, `relancer-survol.png` |
| V2 « … logiciel que j'ai créé pour P.M.S.B., c'est lui. » | La vraie fiche facture s'affiche. Le panneau Relances s'ouvre en glissant, sort de l'écran et vient devant. Sur « créé », le logo PMSB Gestion apparaît, il rebondit sur « P.M.S.B. ». Le message est vide jusqu'à « c'est lui » : alors tout le texte apparaît d'un coup, avec un éclat. | `facture-ouvert.jpg`, `logo-gestion.png`, `panneau-n3.png` |
| V3 « Rappel, relance, mise en demeure : il propose l'étape d'après, avec le texte déjà écrit. » | Escalier 1 · 2 · 3. Chaque marche s'allume sur son mot, et la vraie carte passe au niveau 1, puis 2, puis 3 (volet avec un trait de lumière). Ensuite, gros plan sur les choix : l'historique réel « Relance le 15/10/2026 » est surligné, une flèche va vers « 3. Mise en demeure », la pastille saute de 2 à 3 et l'étiquette « étape suivante proposée » apparaît. Enfin, le vrai texte s'écrit à la machine à écrire. | `panneau-n1/n2/n3.png` |
| V4 « Ça s'ouvre dans ta messagerie, ou ça sort en lettre PDF pour le recommandé. » | Le curseur clique sur « Ouvrir dans ma messagerie » : le vrai message « Relance notée. Vérifiez le message dans votre messagerie avant de l'envoyer. » s'affiche. Puis clic sur « Lettre PDF » : la vraie lettre A4 arrive. Gros plan sur « Lettre recommandée avec accusé de réception », surligné, et sur « Mise en demeure de payer », souligné. La caméra descend ensuite le long de la lettre. | `panneau-n3-survol-messagerie.png`, `panneau-n3-notee*.png`, `lettre-n3.jpg` |
| V5 « Et chaque relance est notée. » | La lettre se pose en biais derrière le panneau, et « Copier le texte » s'allume. Une coche apparaît sur chaque ligne de l'historique : « Rappel le 05/10 » sur « chaque », « Relance le 15/10 » sur « relance », et la nouvelle « Mise en demeure le 23/10/2026 » sur « notée ». Cette dernière ligne a été créée par le vrai clic. | `panneau-n3-notee*.png` |
| Pause longue (0,95 s au moins) | Échéancier : la pastille rouge « 2 » de la barre latérale rebondit, et les retards « 23 jours de retard » et « 7 jours de retard » de la section « En retard » s'entourent. | `ligne-echeancier.png`, `pastille.png`, `el-echeancier-retard.png` |
| V6 « Tes impayés, tu les relances comment ? » | La question en gros (y 590-880), avec « impayés » en rouge et « comment ? » dans un cadre bleu qui se dessine. En haut, l'escalier 1-2-3 continue de s'allumer marche par marche. Ensuite : « Logiciel sur mesure · sur devis » et « Devis gratuit sous 48 h · lien en bio », puis « Partout en France à distance / sur place en Île-de-France », puis « LTNS° ». | (montage) |
| Boucle (≈ 1 s) | La carte remonte dans la pose exacte de l'image 0, le titre revient et le fond flouté réapparaît. La dernière image est l'image 0, et les oscillateurs sont bouclés sur la durée. | `panneau-n3.png` |

### Comment les trois niveaux ont été filmés

La carte est toujours celle de la **même facture**, FAC-2026-0002, à trois moments de sa vie. Pour cela, `capture-app.mjs` retire puis remet les relances de démonstration dans la base de démo, avec `psql`, aux dates du jeu de démo :
- aucune relance : l'appli propose « 1. Rappel » ;
- après le rappel du 05/10 : l'appli propose « 2. Relance » ;
- après la relance du 15/10 : l'appli propose « 3. Mise en demeure ».

C'est la règle du code, `niveauDefaut = min(3, dernier niveau + 1)` dans `factures/[id]/page.tsx`. Le clic sur « Ouvrir dans ma messagerie » est un vrai clic : le code de l'appli note la relance et affiche son message. Seule l'ouverture du client mail est bloquée dans le navigateur de capture.

### Ce qui relève du montage

- Le panneau qui glisse, le texte masqué jusqu'à « c'est lui », la machine à écrire, l'escalier, la pastille qui saute, les coches et les anneaux.
- La machine à écrire révèle les vraies lignes de la capture : leurs positions sont détectées dans l'image.
- On ne dit jamais que le logiciel envoie lui-même l'e-mail ou le recommandé. La mention du recommandé est le texte que l'appli affiche.

### Ce qui n'est jamais lisible

- Sur la lettre :
  - l'adresse, les téléphones et l'e-mail de l'en-tête, même fictifs ;
  - l'adresse du destinataire ;
  - la signature ;
  - le pied de page (SIRET, etc.), qui est coupé.

  L'IBAN visible (`FR76 0000 …`, BIC `DEMOFRPPXXX`) est fictif.
- Les numéros de téléphone des clients de démo sur le tableau de bord, la fiche facture et l'échéancier.
- L'écran Paramètres, la carte « Contrat et documents du chantier », les vrais noms, l'instance de production et le `.env` : rien de tout cela n'est filmé.

## Régénérer les captures

Il faut une copie de travail de l'appli, sans `.git` ni `.env`. Le dépôt `/home/user/pmsb-gestion` n'est jamais modifié. Il faut aussi une base PostgreSQL 16 locale à soi, remplie avec le jeu de démo `scripts/demo-seed.ts`, le même que pour la vidéo 4.

```bash
W=/chemin/de/travail; mkdir -p $W/app
cd /home/user/pmsb-gestion && tar --exclude=.git --exclude=.env -cf - . | tar -xf - -C $W/app
mkdir -p $W/app/demo && cp /home/user/ltns-core/video/vrais-sites/v07-pmsb-gestion-relance/scripts/demo-seed.ts $W/app/demo/seed.ts
cd $W/app && npm ci
# Base de démo (root ne peut pas lancer postgres : on passe par l'utilisateur postgres)
su postgres -s /bin/bash -c "/usr/lib/postgresql/16/bin/initdb -D /var/lib/postgresql/pmsb-demo-v07 -U postgres -A trust -E UTF8 --locale=C.UTF-8"
su postgres -s /bin/bash -c "/usr/lib/postgresql/16/bin/pg_ctl -D /var/lib/postgresql/pmsb-demo-v07 -o '-p 55437 -k /tmp -c listen_addresses=127.0.0.1' -l /var/lib/postgresql/pmsb-demo-v07/server.log start"
psql -h 127.0.0.1 -p 55437 -U postgres -c 'create database pmsb_demo;'
export DATABASE_URL="postgresql://postgres@127.0.0.1:55437/pmsb_demo" SESSION_SECRET="$(head -c 48 /dev/urandom | base64)"
npx prisma migrate deploy && NEXT_TELEMETRY_DISABLED=1 npx next build
./node_modules/.bin/next start -p 3437 -H 127.0.0.1 &        # noter le PID pour l'arrêter ensuite
# Captures (la base est remise à zéro par le jeu de démo à chaque lancement)
cd /home/user/ltns-core/video/vrais-sites/v07-pmsb-gestion-relance/scripts
PMSB_GESTION_APP=$W/app node capture-app.mjs $W/captures
python3 -I build-assets.py $W/captures ../assets
# Arrêt : kill <PID de next-server> ; su postgres -s /bin/bash -c "/usr/lib/postgresql/16/bin/pg_ctl -D /var/lib/postgresql/pmsb-demo-v07 stop -m fast"
```

`capture-app.mjs` (Playwright, `--lang=fr-FR`) produit :
- à 1440 × 900 en DPR 2 : le tableau de bord, son survol de « Relancer », la fiche facture et l'échéancier ;
- en DPR 3 : la carte « Relances » aux niveaux 1, 2 et 3, ses survols, l'état « Relance notée » et les gros plans du tableau de bord et de l'échéancier ;
- la lettre PDF de niveau 3, récupérée à la même adresse que le bouton « Lettre PDF » ;
- `rects.json` : la position de chaque élément et les numéros à flouter.

`build-assets.py` fait le reste :
- il rastérise la lettre à 200 dpi, floute les coordonnées repérées par `pdftotext -bbox` et coupe le pied de page ;
- il floute les téléphones ;
- il découpe le logo, la ligne « Échéancier » et sa pastille ;
- il repère les lignes du message et de l'historique pour la machine à écrire et les coches.

Ces dates dépendent du jour de la capture :
- la date de la lettre, celle de la nouvelle relance et celle du tableau de bord, qui affichent ici le 23/10/2026 ;
- les jours de retard.

Les assets font 2,9 Mo en tout.

## Voix et rendu

La voix n'est pas encore enregistrée : le brouillon utilise le minutage estimé du moteur.

Il y a 6 phrases, une par segment `[pause]` / `[long pause]` du script :
1. « Facture impayée : qui écrit la relance ? »
2. « Dans le logiciel que j'ai créé pour P.M.S.B., c'est lui. »
3. « Rappel, relance, mise en demeure : il propose l'étape d'après, avec le texte déjà écrit. »
4. « Ça s'ouvre dans ta messagerie, ou ça sort en lettre PDF pour le recommandé. »
5. « Et chaque relance est notée. »
6. « Tes impayés, tu les relances comment ? »

P.M.S.B. est lu lettre par lettre. Quand `voice/01.mp3` … `06.mp3` existent :

```bash
cd /home/user/ltns-core
python3 video/commun/sync-voice.py video/vrais-sites/v07-pmsb-gestion-relance     # timing.json, voice.mp3, voice-files.js
node video/commun/render.mjs video/vrais-sites/v07-pmsb-gestion-relance            # MP4 (ignoré par git)
node video/vrais-sites/v07-pmsb-gestion-relance/scripts/planche.mjs /tmp/planche.png 0.5   # planche de contrôle (serveur :8765)
```

Le titre et le crochet de 0 à 3 s ont un minutage fixe. Après 3 s, tout est accroché à des mots (`CUES`) : la vidéo se recale toute seule sur la vraie voix.
- Exemples d'accroches : « logiciel », « créé », « P.M.S.B. », « lui », « Rappel », « relance », « demeure », « propose », « d'après », « texte », « messagerie », « lettre », « PDF », « recommandé », « chaque », « relance », « notée » et « comment ».
- L'échéancier occupe la pause longue, sur 0,95 s au moins.
- La carte de fin démarre avec V6, ou juste après l'échéancier.
- La boucle commence 0,55 s après la dernière phrase.

Les sons sont synthétisés par `video/commun/sfx.py` (pop, tick, whoosh, ding) :
- le ding de l'image 0 ;
- pop, pop, ding pour les trois marches ;
- des tics pendant la frappe ;
- le clic, puis le pop de « Relance notée ».

## Légende et hashtags

Facture impayée : qui écrit la relance ? Dans le logiciel sur mesure créé pour PMSB, c'est lui : rappel, relance, mise en demeure, texte déjà écrit, lettre PDF pour le recommandé, et chaque relance est notée. Données de démonstration, aucune vraie facture. Logiciel sur mesure, prix sur devis · partout en France à distance, sur place en Île-de-France · devis gratuit sous 48 h, lien en bio. #factureimpayee #relanceclient #logicielsurmesure #artisanbtp #batiment #tpe

L'étiquette « contenu généré par IA » est activée (voix clonée), et la couverture est l'image 0.

**Avant publication :** il faut l'accord écrit de PMSB (PLAN-30-JOURS.md l.24). Ne jamais laisser entendre que PMSB a des impayés : tout est en démo.
