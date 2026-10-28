# Badr AI — Système d'Exploitation 1

Plateforme d'apprentissage **hors-ligne** pour le module *Système d'Exploitation 1* :
tout le cours (436 pages), des explications en arabe, et la révision/les examens en français.

> **Comprendre en arabe. Réussir en français.**
> **افهم بالعربية. راجع بالفرنسية. استعد للامتحان بثقة.**

## 🌍 En ligne

La plateforme est publiée sur **GitHub Pages** :

- **Plateforme interactive :** <https://cybader.github.io/badr-ai-se1/>
- **Plan du cours indexable (48 sections) :** <https://cybader.github.io/badr-ai-se1/cours/>
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
| Cours | **436 pages** réparties en **48 sections** et **3 chapitres** |
| Chapitre 1 | Introduction aux systèmes d'exploitation — pages 1–73 |
| Chapitre 2 | Les commandes de base Unix — pages 74–282 |
| Chapitre 3 | Programmation Shell — pages 283–436 |
| Quiz | **120 QCM** corrigés, avec explication en arabe |
| Flashcards | **90 cartes** : terminologie, commandes, concepts |
| Terminal | simulateur Unix interactif + **16 missions** guidées |
| Examen blanc | **20 questions**, chronomètre de **30 minutes**, note sur **20** |
| Outils | calculateur `chmod`, arborescence Unix, séquence de démarrage |

Chaque section propose :

- le **texte du cours en français** (fidèle au support, page par page) ;
- un **résumé explicatif en arabe** (RTL), avec les termes techniques traduits ;
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

## Structure du dossier

```
Plateforme Badr AI/
├── index.html              interface (SPA) + métadonnées SEO
├── cours/                  49 pages HTML statiques indexables (hub + 48 sections)
├── qcm.html                120 QCM corrigés en HTML indexable
├── flashcards.html         90 flashcards en HTML indexable
├── assets/og-image.png     carte de partage 1200×630 (Open Graph / Twitter)
├── css/
│   ├── style.css           design glassmorphism + responsive (SPA)
│   └── seo.css             design des pages statiques + styles d'impression
├── js/
│   ├── data-cours.js       cours complet (window.COURS)
│   ├── data-quiz.js        120 QCM (window.QUIZ)
│   ├── data-flash.js       90 flashcards (window.FLASH)
│   ├── audio.js            moteur sonore Web Audio
│   ├── terminal.js         terminal virtuel + missions
│   └── app.js              navigation, vues, quiz, examen, progression
├── tools/
│   ├── pipeline.py         régénération des données depuis le PDF source
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

La SPA reste la version interactive ; en parallèle, **51 pages HTML statiques** reprennent le texte du
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

Le script lit `../Cours/Cours SE.pdf`, vérifie que les **436 pages** sont présentes, retire les
en-têtes/pieds répétés et les mentions nominatives, puis réécrit `js/data-cours.js`.
Il échoue volontairement si une page manque ou si un nom interdit subsiste.

> Les images des diapositives ne sont pas intégrées : elles contiennent des logos et des noms
> institutionnels. Le contenu utile (texte, formules, commandes, schémas décrits) est conservé page par page.
> La page 282, purement visuelle dans le PDF, affiche un repère explicite.

---

## Raccourcis et astuces

- `#cours/s20` dans l'URL ouvre directement une section (ici les droits d'accès et `chmod`).
- Dans le terminal : ↑ / ↓ pour l'historique, `Ctrl+L` pour effacer, `Tab` pour compléter les chemins.
- Dans les flashcards : clic sur la carte pour retourner, boutons ← / → pour naviguer.
- L'examen blanc se corrige automatiquement ; la meilleure note est conservée.

---

## بالعربية

هذه المنصة تجمع **كامل مقرر أنظمة التشغيل 1 (436 صفحة)** في فضاء واحد يعمل **بدون إنترنت**:

- شرح مبسّط لكل قسم **بالعربية**، مع المصطلحات التقنية مترجمة؛
- نص المقرر والأسئلة والامتحان **بالفرنسية**، لأن الامتحان بالفرنسية؛
- **120 سؤال QCM** مع التصحيح والتعليل؛
- **90 بطاقة مراجعة** و**محاكي طرفية Unix** مع **16 مهمة موجهة**؛
- **امتحان تجريبي** من 20 سؤالًا في 30 دقيقة، بتنقيط على 20.

**للتشغيل:** انقر نقرًا مزدوجًا على `Lancer Badr AI.vbs` أو على `index.html`.
تُحفظ نتائجك تلقائيًا في المتصفح، ويمكن حذفها من زر إعادة التعيين ↺.

**عبر الإنترنت:** <https://cybader.github.io/badr-ai-se1/>
**خطة الدرس (48 قسمًا بصفحات HTML قابلة للفهرسة):** <https://cybader.github.io/badr-ai-se1/cours/>
**120 سؤال QCM مع التصحيح:** <https://cybader.github.io/badr-ai-se1/qcm.html>
**90 بطاقة مراجعة:** <https://cybader.github.io/badr-ai-se1/flashcards.html>
**المستودع:** <https://github.com/Cybader/badr-ai-se1>
