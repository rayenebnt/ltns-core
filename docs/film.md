# Film de présentation LTNS°

Le film (43 s) existe en deux versions :

- `public/motion.html` : l'animation d'origine (HTML + GSAP), sans son.
  Formats : `?format=16x9` (paysage) ou `?format=9x16` (vertical).
- `public/film/` : les vidéos avec voix off, utilisées par la section « Le film » du site
  (`src/components/Film.jsx`) :
  - `ltns-film-16x9.mp4` : paysage 1920×1080, affiché sur ordinateur et tablette
  - `ltns-film-9x16.mp4` : vertical 1080×1920, affiché sur téléphone
  - `ltns-film-16x9.jpg`, `ltns-film-9x16.jpg` : images d'aperçu
  - `ltns-film.vtt` : sous-titres de la voix off (bouton CC du lecteur)

## Voix off

Voix de synthèse française (Kokoro, modèle open source sous licence Apache 2.0),
calée sur les scènes du film, avec un habillage sonore discret (nappe, pulsation,
transitions) qui s'efface sous la voix. Pour la remplacer par votre propre voix, enregistrez
le texte ci-dessous en respectant les temps de départ, puis remplacez la piste audio
des deux vidéos.

| Début | Fin | Texte |
|---|---|---|
| 0.45 s | 4.66 s | Aujourd'hui, vos futurs clients vous cherchent en ligne. Encore faut-il qu'ils vous trouvent. |
| 7.30 s | 8.62 s | Le web, au bon degré. |
| 9.30 s | 14.44 s | Je crée votre site internet : je le dessine avec vous, je le construis, et je le mets en ligne. |
| 15.00 s | 17.61 s | Un site sur mesure, rapide, et à votre image. |
| 19.80 s | 23.86 s | Un site lisible sur ordinateur, sur téléphone, et trouvé sur Google. |
| 25.10 s | 27.55 s | Résultat : vos visiteurs deviennent des clients. |
| 29.40 s | 32.75 s | Devis, maquette, construction, mise en ligne : je m'occupe de tout. |
| 35.10 s | 38.38 s | Envie d'un site au bon degré ? Demandez votre devis gratuit. |
| 39.30 s | 42.28 s | Réponse sous 48 heures. Le web, au bon degré. |
