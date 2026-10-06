# TikTok « Site, appli ou logiciel ? » — Épisode 02

Un test en 3 questions ; chaque « oui » fait naître une création LTNS° à l'écran :
le site (bleu), l'appli (violet), le logiciel (orange), puis les trois ensemble.
Bandeau : « LTNS° // SITE · APPLI · LOGICIEL ». Avatar sans barbe.

| Fichier | Rôle |
|---|---|
| `tiktok.html` | La vidéo : textes (`SENTENCES`), mise en scène (`BEATS`), couleurs (`SENTENCE_COLORS`) |
| `voice/` | Les phrases de la voix off, `01.mp3` à `10.mp3` (à fournir) |

L'avatar, les polices et les outils sont dans [`../commun/`](../commun/) (voir [`../README.md`](../README.md)).

## Voix off ElevenLabs

Une phrase par fichier, même voix que l'épisode 01, fichiers `01.mp3` à `10.mp3` dans `voice/` :

| Fichier | Texte |
|---|---|
| `01.mp3` | Site, appli ou logiciel : tu ne sais pas ce qu'il te faut ? |
| `02.mp3` | Fais le test : trois questions. |
| `03.mp3` | Question un : tu veux que de nouveaux clients te trouvent ? |
| `04.mp3` | Alors il te faut un site. |
| `05.mp3` | Question deux : tes clients réservent ou commandent souvent chez toi ? |
| `06.mp3` | Alors il te faut une appli. |
| `07.mp3` | Question trois : tu perds des heures sur des tableaux Excel ? |
| `08.mp3` | Alors il te faut un logiciel, fait pour ton métier. |
| `09.mp3` | Trois fois oui ? Je peux créer les trois. |
| `10.mp3` | Commente ton métier : je te dis ce que je créerais pour toi. |

```bash
# depuis la racine du dépôt
python3 -m http.server 8765 --directory . &
python3 video/commun/sync-voice.py video/tiktok-episode-02
node video/commun/render.mjs video/tiktok-episode-02   # → video/tiktok-episode-02/ltns-tiktok-episode-02.mp4
```

## Publication

**Légende**

> Site, appli ou logiciel : lequel il te faut ? Fais le test en 3 questions 👇
> Commente ton métier, je te dis ce que je créerais pour toi.

**Hashtags** : `#entrepreneur #application #siteinternet #logiciel #independant`

**Commentaire à épingler** : « Je réponds à chaque métier en vidéo : site, appli ou logiciel ? »
