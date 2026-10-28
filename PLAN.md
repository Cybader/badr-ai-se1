# خطة بناء منصة «Badr AI — Système d'Exploitation 1»

> **المرجع الرسمي للعمل.** أي جلسة جديدة تبدأ بقراءة هذا الملف + `PROGRESS.md` قبل أي تعديل.
> آخر تحديث: 2026-10-28

---

## 1. الهدف

بناء **منصة تعلّم تفاعلية احترافية** لمادة **Système d'Exploitation 1**:

- **الفهم بالعربية** 🇲🇦 — كل قسم له شرح عربي مبسّط وواضح.
- **الدراسة والامتحانات بالفرنسية** 🇫🇷 — نص الكورس، المصطلحات، الأسئلة، والامتحان التجريبي كلها بالفرنسية.
- **الدرس كامل دون نقصان** — كل صفحات الكورس (436 صفحة) موجودة داخل المنصة، مع أرقام الصفحات.
- **تصميم زجاجي حديث (Glassmorphism)** + أصوات + تفاعلات + تأثيرات بصرية.
- **يعمل بدون إنترنت** — ملفات ثابتة HTML/CSS/JS، بدون CDN أو مكتبات خارجية.
- **علامة Badr AI فقط** — بدون اسم أي دكتور أو جامعة أو مؤسسة.

---

## 2. المصادر والمحتوى

| الملف | الصفحات | الدور |
|---|---|---|
| `Cours SE.pdf` | 436 | **المصدر الأساسي الكامل** (يغطي الفصول الثلاثة من البداية إلى النهاية) |
| `Cours SE ....pdf` | 340 | نسخة أقدم/مطابقة — تُستخدم للمقارنة فقط، لا تُضاف لتجنّب التكرار |
| `Cours SE 2.pdf` | 179 | نسخة مختصرة — مرجع تحقق |
| `Cours SE 25.pdf` | 118 | نسخة مختصرة — مرجع تحقق |
| `Fiche_Toutes_Les_Commandes_SE1.pdf` | 48 | فهرس الأوامر، يُستخدم لبناء المحاكي والأسئلة |
| `TD_TP/TP 1..4.pdf` | ممسوحة | تُقرأ لاحقًا بموديل بصري وتُحوّل لتمارين عملية |

**ضمان «دون نقصان»:** سكربت التحويل يسجّل عدد الصفحات المُدخلة ويقارنها بـ 436؛ أي صفحة مفقودة = فشل التحقق (assert). النص يُنظَّف من ترويسات وتذييلات التكرار فقط، ولا يُحذف أي محتوى علمي.

**إزالة الأسماء:** يُحذف تلقائيًا كل سطر يحتوي اسم الأستاذ أو الجامعة أو الكلية أو المستوى أو رقم الجزء (ترويسة متكررة في كل شريحة). القائمة الدقيقة محفوظة داخل سكربت التحويل فقط.
تُستبدل صفحة الغلاف بشعار **Badr AI**.

---

## 3. هيكل المحتوى (كما هو في الكورس)

### Chapitre 1 — Introduction aux systèmes d'exploitation (صفحات 1–73)
1. Présentation du module & objectifs
2. Le système informatique (hardware/software, carte mère, CPU)
3. Le système d'exploitation (machine étendue / gestionnaire de ressources, services)
4. Composants & structure externe (noyau, ordonnanceur, gestionnaires, chargeur)
5. Les principaux systèmes d'exploitation (MS-DOS, Mac OS, Unix, Linux, Windows)
6. Unix, logiciels libres & GPL
7. Dual boot, GRUB & séquence de démarrage
8. GNU/Linux, distributions & Ubuntu

### Chapitre 2 — Les commandes de base Unix (صفحات 74–282)
1. Shell, terminal & format des commandes
2. Gestion des fichiers & arborescence
3. Inodes, types & données des fichiers
4. Commandes d'accès & manipulation (ls, cp, mv, rm, touch, find, locate…)
5. Liens physiques & symboliques
6. Lecture & filtrage (cat, head, tail, cut, sort, wc, tr, diff…)
7. Commandes système & identification (uname, su, sudo…)
8. Expressions régulières
9. grep, find & exercices + alias
10. Séparateurs conditionnels & redirections (`; && ||`, `< > >> 2> |`)
11. Utilisateurs & groupes
12. Droits d'accès & chmod (octal + symbolique)
13. chown, chgrp, umask
14. Gestion des utilisateurs (adduser, deluser, usermod…)
15. Archives tar
16. Composition des commandes (`; & () {}`)
17. Contrôle des processus (fg, bg, ps, kill…)
18. Éditeurs de texte (gedit, vi/vim)
19. Shells & variables d'environnement (intro)

### Chapitre 3 — Programmation Shell (صفحات 283–436)
1. Le shell interpréteur, commandes internes/externes
2. Les scripts shell (`#!/bin/bash`, chmod +x)
3. Paramètres & variables
4. read & saisie au clavier
5. Quotes & export
6. Variables d'environnement
7. Substitutions & paramètres positionnels
8. Substitution de commande (`$(...)`)
9. `${paramètre}`, paramètres non définis, unset
10. Redirections & scripts
11. Tests de conditions (`test`, `[ ]`, `[[ ]]`)
12. Expressions arithmétiques (`(( ))`, expr, let, declare -i)
13. Structures de contrôle : if / then / elif / else
14. case / esac
15. Boucles for
16. while / until + break / continue
17. select, options shell, exec
18. expr
19. Fonctions (définition, arguments, return, local, export -f)
20. Récursion & source
21. Tableaux (indexés & associatifs)

> كل قسم = عنوان فرنسي + عنوان عربي + **شرح عربي كامل** + صفحاته الأصلية كاملة + مسرد مصطلحات (FR ↔ AR) عند الحاجة.

---

## 4. ميزات المنصة

### 4.1 الواجهة (Accueil / Dashboard)
- Hero زجاجي مع عنوان المادة، شعار **Badr AI**، عدّاد تقدم دائري، XP ومستوى.
- إحصائيات: الأقسام المقروءة، أفضل نتيجة اختبار، المهام المنجزة، البطاقات المتقنة.
- اختصارات سريعة لكل قسم.

### 4.2 Cours — قارئ الكورس الكامل
- 3 فصول ← ~48 قسمًا ← كل الصفحات (436) قابلة للتنقل.
- عرض نظيف: عناوين، قوائم، أوامر في كتل code، جداول.
- زر **«🇲🇦 الشرح بالعربية»** في كل قسم يفتح لوحة RTL كاملة.
- تعليم القسم كمقروء + شريط تقدم لكل فصل.
- بحث فوري داخل الكورس (عنوان القسم/المصطلح) وفتح النتيجة.

### 4.3 Terminal — محاكي Unix تفاعلي
- نظام ملفات افتراضي كامل (/, /home/etudiant, /etc, /bin…).
- أوامر مدعومة: `ls cd pwd mkdir rmdir touch cat echo cp mv rm head tail wc grep find sort uniq cut chmod chown chgrp whoami id groups date hostname du df file ln tar ps kill man history clear help` + أنابيب `|` وإعادة توجيه `< > >> 2>`.
- تاريخ أوامر (↑/↓)، إكمال تلقائي بـ Tab، إعادة تعيين النظام.
- **16 مهمة عملية** (Mission) بالفرنسية + تلميح عربي، تحقق آلي من الأمر الصحيح، مكافأة XP + Confetti.

### 4.4 Quiz — اختبارات قصيرة
- ~80 سؤال QCM بالفرنسية، مصنّفة حسب الفصل، مع شرح عربي بعد كل إجابة.
- خلط الأسئلة والخيارات، نتيجة فورية، مراجعة الأخطاء، أفضل نتيجة محفوظة.

### 4.5 Flashcards — بطاقات مراجعة
- ~70 بطاقة: مصطلح FR ↔ معناه AR، وأمر ↔ وظيفته.
- قلب البطاقة بحركة 3D، تصنيف «أتقنتها / أراجعها»، عداد إتقان.

### 4.6 Examen — امتحان تجريبي
- 20 سؤالًا عشوائيًا من كل الفصول، مؤقّت 30 دقيقة، تنقل بين الأسئلة.
- تصحيح نهائي بنقطة /20، عرض الإجابات مع الشرح العربي، وكشف «مصائد الامتحان».

### 4.7 Outils — أدوات تفاعلية
- **Calculateur chmod:** مزامنة مباشرة بين rwx والرقم الثماني والتمثيل الرمزي + معاينة `ls -l`.
- **Séquence de démarrage:** أنيميشن BIOS → GRUB → Noyau → Shell مع شرح عربي لكل خطوة.
- **Arborescence Linux:** شجرة تفاعلية قابلة للنقر لاستكشاف أدوار المجلدات.

### 4.8 الصوت والتأثيرات
- محرّك صوت بـ Web Audio API (بدون ملفات): نقرة، Hover، نجاح، خطأ، كتابة، جرس Terminal، فانفير إتمام.
- زر كتم الصوت (محفوظ) + تشغيل الأصوات فقط بعد أول تفاعل (سياسة المتصفحات).
- خلفية Aurora متحركة + جسيمات Canvas + توهج يتبع المؤشر.
- Tilt خفيف للبطاقات، Ripple للأزرار، انتقالات صفحات، Confetti عند النجاح.
- احترام `prefers-reduced-motion`.

### 4.9 الحفظ والتقدم
- `localStorage`: الأقسام المقروءة، نتائج الاختبارات، المهام، البطاقات، XP، الصوت.
- زر إعادة تعيين التقدم.

---

## 5. التصميم (Design System)

| العنصر | القيمة |
|---|---|
| الخلفية | `#070b18` مع تدرجات Aurora بنفسجي/سماوي |
| الزجاج | `rgba(255,255,255,.06)` + `backdrop-filter: blur(18px)` + حدود `rgba(255,255,255,.12)` |
| الألوان | بنفسجي `#7c5cff`، سماوي `#22d3ee`، وردي `#f472b6`، أخضر نجاح `#34d399`، أحمر خطأ `#fb7185` |
| الحواف | 20–28px، ظلال ناعمة |
| الخطوط | Segoe UI / Tahoma (FR) + نفس العائلة (AR) — بدون تحميل خارجي |
| الاتجاه | FR = LTR، لوحات الشرح = RTL |
| الحركة | 180–400ms ease، Spring خفيف، بلا إفراط |

---

## 6. البنية التقنية

```
Plateforme Badr AI/
├─ index.html                 ← هيكل SPA (شاشات + Overlays)
├─ css/style.css              ← نظام التصميم الزجاجي + RTL + Responsive
├─ js/audio.js                ← محرّك الصوت (Web Audio)
├─ js/data-cours.js           ← [مُولَّد] الكورس كاملًا + الشروحات العربية
├─ js/data-quiz.js            ← بنك الأسئلة (FR + AR)
├─ js/data-flash.js           ← بطاقات المراجعة
├─ js/terminal.js             ← نظام الملفات الافتراضي + الأوامر + المهام
├─ js/app.js                  ← التوجيه، العرض، التقدم، الأدوات، الامتحان
├─ tools/pipeline.py          ← استخراج PDF → data-cours.js (قابل لإعادة التشغيل)
├─ PLAN.md  /  PROGRESS.md
├─ README.md                  ← دليل الاستخدام
└─ Lancer Badr AI.vbs         ← تشغيل بنقرة واحدة
```

**قرارات تقنية:**
- Vanilla JS (ES2020)، بدون Build step — يعمل بالنقر المزدوج على `index.html`.
- البيانات في ملفات JS عالمية (`window.COURS`, `window.QUIZ`, …) لتجنّب مشاكل `file://` مع `fetch`.
- عرض الصفحات عند الطلب (lazy) لتفادي بطء DOM مع 436 صفحة.
- كل الملفات UTF-8.

---

## 7. مراحل التنفيذ ومعايير القبول

| المرحلة | المخرجات | معيار القبول |
|---|---|---|
| **P0 — التأسيس** | المجلد، الهيكل، Design tokens | تفتح الصفحة وتعرض الهيكل الزجاجي بدون أخطاء Console |
| **P1 — خط البيانات** | `pipeline.py` → `data-cours.js` | 436/436 صفحة، 3 فصول، ≈48 قسمًا، 0 أسماء مؤسسات، تحقق آلي ينجح |
| **P2 — الواجهة العامة** | Home + Nav + خلفية + أصوات | تنقل سلس، أصوات تعمل بعد أول نقرة، Responsive |
| **P3 — قارئ الكورس** | Chapters/Sections/Pages + لوحات AR + بحث + تقدم | كل صفحة قابلة للقراءة، الشرح العربي يظهر/يختفي، التقدم يُحفظ |
| **P4 — Terminal** | FS افتراضي + ~30 أمرًا + 16 مهمة | المهام تُقبل فقط عند الأمر الصحيح، XP + أصوات |
| **P5 — التقييم** | Quiz + Flashcards + Examen | نتائج صحيحة، حفظ أفضل نتيجة، تصحيح مع AR |
| **P6 — الأدوات** | chmod + Boot + Tree | تفاعل مباشر + شروح عربية |
| **P7 — الصقل والاختبار** | QA شامل + README + Launcher | اختبار في المتصفح (سطح مكتب + موبايل)، لا أخطاء Console، مراجعة بصرية |
| **P8 — التوسعة (اختياري)** | OCR لملفات TP + تمارين إضافية | تمارين TP داخل المنصة |

**سجل التقدم:** بعد كل مرحلة يُحدَّث `PROGRESS.md` (ما أُنجز / ما بقي / قرارات / مشاكل).

---

## 8. توزيع الموديلات (Best model per task)

كل الموديلات المعروضة مجانية. التوصية حسب طبيعة المهمة:

| المهمة | الموديل المقترح | السبب |
|---|---|---|
| التخطيط المعماري ومراجعة القرارات | **Beam Free** | أكبر نموذج (501B MoE) — تفكير عام وتخطيط قوي |
| استخراج/تنظيف بيانات PDF + Python | **DeepSeek V4.1 Flash Free** ✅ (الحالي) | دقة عالية في الكود والالتزام الحرفي بالتعليمات |
| كتابة الشروحات العربية + Quiz + Flashcards | **GLM-5.3-Flash Free** أو **Beam Free** | متعدد اللغات وقوي في الصياغة العربية |
| تنفيذ الواجهة (HTML/CSS/JS + Glass + Sounds) | **Flint 40B Free** (الافتراضي) أو DeepSeek | Flint هو الافتراضي وغالبًا الأقوى في الواجهات |
| قراءة PDF الممسوحة (TP) بالصور | **Nemotron 3.5 Super VL Free** | نموذج بصري (Vision-Language) |
| مراجعة لقطات الشاشة بصريًا (QA) | **Nemotron 3.5 Super VL Free** | يفهم الصور ويقارن التصميم |
| مهام سريعة/تعديلات صغيرة | **Nemotron 3.5 Lightning Free** أو **MiMo-V2.6-Flash Free** | سرعة |
| إصلاح الأخطاء النهائي وQA منطقي | **DeepSeek V4.1 Flash Free** | تتبّع دقيق للأخطاء |

**توصية عملية:** إبقاء **DeepSeek V4.1 Flash** لجلسة البناء الأساسية (P1–P4) لضمان الاتساق، ثم:
- جلسة/وكيل فرعي بـ **GLM-5.3-Flash** لصقل المحتوى العربي (P5).
- جلسة **Nemotron 3.5 Super VL** لقراءة TPs ومراجعة الصور (P8/QA).
- **Flint 40B** كبديل لواجهة/تصميم إذا أردت أقصى جودة بصرية.
> ممنوع تبديل الموديل في منتصف مرحلة برمجية دون تحديث `PROGRESS.md` (فقدان السياق).

---

## 9. المخاطر ومعالجتها

| الخطر | المعالجة |
|---|---|
| تشويه نص PDF (أسطر مقطوعة، رموز) | خوارزمية دمج أسطر + قواعد تنظيف + فحص عينات يدوي |
| فقدان صفحة من الكورس | Assert على العدد 436 + تقرير فحص |
| مشاكل RTL مع الفرنسية | لوحات AR مستقلة `dir="rtl"`، تنسيق خطوط واضح |
| حظر الصوت التلقائي | تفعيل المحرك عند أول نقرة/مفتاح فقط |
| بطء مع 436 صفحة | عرض قسم واحد فقط في DOM (lazy) |
| تبديل الموديل يفقد السياق | PLAN + PROGRESS + قرارات موثقة |
| مساحة localStorage | تخزين مؤشرات صغيرة فقط (لا نصوص) |

---

## 10. معايير الجودة النهائية

- [ ] 436/436 صفحة، بلا أسماء دكتور/جامعة.
- [ ] كل قسم فيه شرح عربي سليم ومفهوم.
- [ ] Terminal: 16 مهمة تعمل، لا Crash، رسائل أخطاء واقعية.
- [ ] Quiz/Examen: لا سؤال بلا إجابة صحيحة، شرح عربي لكل سؤال.
- [ ] أصوات + تأثيرات تعمل وتُكتم.
- [ ] Responsive 360px → 1920px.
- [ ] 0 أخطاء Console.
- [ ] README يشرح التشغيل والاستخدام.
