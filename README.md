# Badr AI — Système d'Exploitation 1

Plateforme d'apprentissage **hors-ligne** pour le module *Système d'Exploitation 1* :
tout le cours SE1, des explications en arabe, et la révision/les examens en français.

> **Comprendre en arabe. Réussir en français.**
> **افهم بالعربية. راجع بالفرنسية. استعد للامتحان بثقة.**

## 🌍 En ligne

La plateforme est publiée sur **GitHub Pages** :

- **Plateforme interactive :** <https://cybader.github.io/badr-ai-se1/>
- **Programme indexable (48 leçons) :** <https://cybader.github.io/badr-ai-se1/cours/>
- **120 QCM corrigés :** <https://cybader.github.io/badr-ai-se1/qcm.html>
- **90 flashcards :** <https://cybader.github.io/badr-ai-se1/flashcards.html>
- **Dépôt GitHub :** <https://github.com/Cybader/badr-ai-se1>

Le site en ligne fonctionne aussi **hors-ligne** une fois la page ouverte : aucun compte, aucun serveur
applicatif, aucune dépendance externe.

---

## Lancer la plateforme

1. Ouvrir le dossier `Plateforme Badr AI`.
2. Double-cliquer sur **`Lancer Badr AI.vbs`**.
3. Le navigateur par défaut s'ouvre sur `index.html`.

Alternative : double-cliquer directement sur `index.html`.
Aucune installation, aucun compte, aucune connexion Internet requise.

> Si un navigateur très strict bloque les scripts locaux, servir le dossier avec un petit serveur local
> (`python -m http.server 8765`) puis ouvrir `http://127.0.0.1:8765/`.

---

## Contenu

| Élément | Détail |
|---|---|
| Cours | **48 leçons** réparties en **3 chapitres** |
| Chapitre 1 | Introduction aux systèmes d'exploitation |
| Chapitre 2 | Les commandes de base Unix |
| Chapitre 3 | Programmation Shell |
| Quiz | **120 QCM** corrigés, avec explication en arabe |
| Flashcards | **90 cartes** : terminologie, commandes, concepts |
| Terminal | simulateur Unix interactif + **16 missions** guidées |
| Examen blanc | **20 questions**, chronomètre de **30 minutes**, note sur **20** |
| Outils | calculateur `chmod`, arborescence Unix, séquence de démarrage |
| Voix neuronale | **48 leçons en MP3 arabe** (voix IA pré-générée, hors-ligne) + repli Web Speech |
| Coach vocal | **voix arabe optionnelle** : encouragement, retour de quiz, rappels d'examen (Web Speech API) |

Chaque section propose :

- le **texte du cours en français** ;
- un **résumé explicatif en arabe** (RTL), avec les termes techniques traduits ;
- des **cartes de termes cliquables** : clic (ou « استمع للمصطلحات » pour tout écouter) prononce le
  terme en français puis sa signification en arabe — fonctionne même quand le coach vocal est coupé ;
- une **galerie d'illustrations** (210 planches WebP) avec agrandissement plein écran ;
- le bouton **« استمع للشرح »** : lecture du résumé arabe par la **voix neuronale intégrée**
  (MP3 embarqués, disponibles hors-ligne), avec repli automatique sur la synthèse du navigateur ;
- un bouton **« Marquer comme lu »** qui alimente la progression et les XP.

---

## Terminal Unix

Le terminal fonctionne sur un **système de fichiers virtuel** : aucune commande réelle n'est exécutée
sur l'ordinateur. Il prend en charge les tubes `|`, les redirections `>`, `>>`, `<`, `2>`, les
enchaînements `;`, `&&`, `||`, l'expansion `*`, `?`, `~`, les variables et les scripts.

Quelques commandes : `ls`, `cd`, `pwd`, `mkdir`, `touch`, `cp`, `mv`, `rm`, `cat`, `grep`, `cut`,
`sort`, `wc`, `head`, `tail`, `chmod`, `find`, `expr`, `date`, `echo`, `man`…

Tape `help` pour la liste, `man <commande>` pour le mode d'emploi, et ouvre le panneau **Missions**
à droite pour les 16 exercices (indices en arabe).

---

## Progression et données

- La progression est enregistrée **dans le navigateur** (`localStorage`) :
  sections lues, XP, niveaux, scores de quiz, meilleure note d'examen, cartes maîtrisées, missions.
- Elle reste donc privée et disponible hors-ligne.
- Le bouton ↺ dans la barre latérale **réinitialise** la progression (après confirmation).
- Le bouton haut-parleur active/coupe les effets sonores (synthétisés par Web Audio, sans fichiers audio).

---

## Coach vocal arabe

Un **coach vocal optionnel en arabe** accompagne la révision : message de bienvenue, encouragement après une
section lue, retour immédiat après une réponse de quiz, rappel à 5 minutes de la fin de l'examen, résultat
d'examen, mission terminée et bouton **« حفّزني »** (motive-moi).

- **Désactivé par défaut** : aucun son n'est émis sans action explicite. C'est volontaire pour ne pas
  entrer en conflit avec un lecteur d'écran.
- **Deux interrupteurs** : barre latérale et barre supérieure ; le bouton **⏹ إيقاف** coupe la parole
  immédiatement.
- **Réglages** dans *Outils* → carte « المرافق الصوتي » : activation, choix de la voix arabe, vitesse,
  volume, retour après chaque réponse, test et arrêt.
- **Aucune requête réseau** émise par `js/voice.js` : le module utilise uniquement `speechSynthesis` du
  navigateur. Selon le système, la voix peut être locale (hors-ligne) ou fournie par le système
  d'exploitation ; l'interface indique si une voix est locale.
- **Persistance** : les réglages sont stockés sous `badrai.se1.voice` ; la progression reste sous
  `badrai.se1.progress`, `badrai.se1.term` et `badrai.se1.sound`.
- **Si aucune voix arabe n'est installée**, l'interface affiche un avertissement et propose la voix par
  défaut du navigateur ; ajouter une voix arabe dans les réglages du système puis recharger la page.
- **Lecture d'une section** : le bouton **« استمع للشرح »** lit le résumé arabe en priorité par la
  **voix neuronale pré-générée** (`assets/audio/s*.mp3`, voix IA `ar-SA-HamedNeural`,-rate lente pour
  l'apprentissage) ; si le MP3 d'une leçon est absent, repli automatique sur la lecture par blocs du
  `speechSynthesis`. Arrêt immédiat et navigation jamais bloquée ; une seule source sonore à la fois
  (terme, leçon ou coach).

---

## Structure du dossier

```
Plateforme Badr AI/
├── index.html              interface (SPA) + métadonnées SEO
├── cours/                  49 fichiers HTML statiques indexables (hub + 48 leçons)
├── qcm.html                120 QCM corrigés en HTML indexable
├── flashcards.html         90 flashcards en HTML indexable
├── assets/og-image.png     carte de partage 1200×630 (Open Graph / Twitter)
├── assets/lecons/          210 illustrations de cours en WebP (900 px) + vignettes 360 px
├── css/
│   ├── style.css           design blanc minimal, accents bleus + responsive (SPA)
│   └── seo.css             design des pages statiques + styles d'impression
├── assets/audio            voix neuronale arabe des leçons (MP3 hors-ligne) + échantillons
├── js/
│   ├── data-cours.js       cours complet (window.COURS)
│   ├── data-quiz.js        120 QCM (window.QUIZ)
│   ├── data-flash.js       90 flashcards (window.FLASH)
│   ├── data-images.js      illustrations par section (window.LESSON_IMAGES)
│   ├── audio-map.js        mapping leçon → fichier MP3 (généré)
│   ├── audio.js            moteur sonore Web Audio
│   ├── voice.js            coach vocal arabe (Web Speech API, opt-in, sans réseau)
│   ├── terminal.js         terminal virtuel + 16 missions illustrées
│   └── app.js              navigation, vues, galerie/lightbox, quiz, examen, progression, réglages voix
├── tools/
│   ├── pipeline.py         régénération des données depuis le PDF source
│   ├── prepare-images.py   détourage, redimensionnement WebP et manifeste des illustrations
│   ├── gen-audio.py        génération des MP3 de voix neuronale + audio-map.js
│   ├── build-seo.js        génération de /cours/, sitemap.xml, robots.txt, 404.html
│   └── og-card.html        source de la carte de partage (capture 1200×630)
├── sitemap.xml             52 URL canoniques
├── robots.txt              règles d'exploration + sitemap
├── 404.html                page d'erreur aux couleurs de la plateforme
├── .nojekyll               publication GitHub Pages sans traitement Jekyll
├── Lancer Badr AI.vbs      lanceur Windows
├── README.md               ce fichier
├── PLAN.md                 architecture et choix techniques
└── PROGRESS.md             journal de réalisation et vérifications
```

Les données sont chargées par des balises `<script>` classiques (variables globales), ce qui permet
un fonctionnement direct en `file://` sans serveur ni build.

---

## SEO et publication GitHub Pages

La SPA reste la version interactive ; en parallèle, **51 fichiers HTML statiques** reprennent le texte du
cours, le résumé arabe, les termes techniques, les **120 QCM corrigés** et les **90 flashcards** pour
être lus par les moteurs de recherche et les étudiants qui n'ont pas JavaScript.

Chaque page contient :

- un `title` et une `meta description` uniques, des mots-clés ciblés (SE1, Unix, Shell, QCM, شرح عربي) ;
- une URL canonique, des balises **Open Graph** et **Twitter Card** avec `assets/og-image.png` ;
- des données structurées **JSON-LD** (`Course`, `LearningResource`, `BreadcrumbList`, `ItemList`) ;
- un fil d'Ariane, la pagination entre sections et des liens vers la plateforme interactive.

Le fichier `sitemap.xml` liste les **52 URL** du site et `robots.txt` le référence. Le plan du cours,
les QCM et les flashcards sont aussi accessibles depuis le pied de page de la SPA, la navigation des
pages statiques et un fallback `<noscript>`.

### Régénérer les pages SEO

```powershell
cd "Plateforme Badr AI"
node tools/build-seo.js
```

Pour changer de domaine ou de dépôt, définir l'URL de base avant la génération :

```powershell
$env:SITE_URL = "https://cybader.github.io/badr-ai-se1"
node tools/build-seo.js
```

La carte de partage se régénère depuis `tools/og-card.html` (capture Chrome en 1200×630, puis
enregistrement dans `assets/og-image.png`).

### Mettre à jour le site en ligne

```powershell
git add -A
git commit -m "Mise à jour de la plateforme"
git push
```

GitHub Pages republie automatiquement la branche `main` (source : racine du dépôt). Après une mise à
jour majeure, soumettre le sitemap dans **Google Search Console** :
`https://cybader.github.io/badr-ai-se1/sitemap.xml`.

---

## Régénérer le cours (optionnel, pour maintenance)

Prérequis : Python 3, `pymupdf`.

```powershell
cd "Plateforme Badr AI"
python tools/pipeline.py
```

Le script lit `../Cours/Cours SE.pdf`, vérifie que le cours complet est présent, retire les
en-têtes/pieds répétés et les mentions nominatives, puis réécrit `js/data-cours.js`.
Il échoue volontairement si une page manque ou si un nom interdit subsiste.

> Les images des diapositives ne sont pas intégrées : elles contiennent des logos et des noms
> institutionnels. Le contenu utile (texte, formules, commandes, schémas décrits) est conservé.
> Les contenus purement visuels sont traités séparément.

---

## Raccourcis et astuces

- `#cours/s20` dans l'URL ouvre directement une section (ici les droits d'accès et `chmod`).
- Dans le terminal : ↑ / ↓ pour l'historique, `Ctrl+L` pour effacer, `Tab` pour compléter les chemins.
- Dans les flashcards : clic sur la carte pour retourner, boutons ← / → pour naviguer.
- L'examen blanc se corrige automatiquement ; la meilleure note est conservée.
- Le bouton 🎙️ active le coach vocal ; ⏹ arrête la lecture ; les réglages fins sont dans *Outils*.

---

## بالعربية

هذه المنصة تجمع **كامل مقرر أنظمة التشغيل 1** في فضاء واحد يعمل **بدون إنترنت**:

- شرح مبسّط لكل درس **بالعربية**، مع المصطلحات التقنية مترجمة **ونطقها مسموع بالفرنسية ثم بالعربية**؛
- **صوت درس عصبي ذكي** (ملفات MP3 جاهزة تعمل هاتفًا وحاسوبًا بدون إنترنت) لقراءة الشرح العربي؛
- نص المقرر والأسئلة والامتحان **بالفرنسية**، لأن الامتحان بالفرنسية؛
- **120 سؤال QCM** مع التصحيح والتعليل؛
- **90 بطاقة مراجعة** و**محاكي طرفية Unix** مع **16 مهمة موجهة**؛
- **امتحان تجريبي** من 20 سؤالًا في 30 دقيقة، بتنقيط على 20؛
- **مرافق صوتي عربي اختياري** للتحفيز والتغذية الراجعة وتلاوة شرح القسم، متوقف افتراضيًا ولا يرسل أي بيانات.

**للتشغيل:** انقر نقرًا مزدوجًا على `Lancer Badr AI.vbs` أو على `index.html`.
تُحفظ نتائجك تلقائيًا في المتصفح، ويمكن حذفها من زر إعادة التعيين ↺.

**عبر الإنترنت:** <https://cybader.github.io/badr-ai-se1/>
**خطة الدروس (48 درسًا بصفحات HTML قابلة للفهرسة):** <https://cybader.github.io/badr-ai-se1/cours/>
**120 سؤال QCM مع التصحيح:** <https://cybader.github.io/badr-ai-se1/qcm.html>
**90 بطاقة مراجعة:** <https://cybader.github.io/badr-ai-se1/flashcards.html>
**المستودع:** <https://github.com/Cybader/badr-ai-se1>
