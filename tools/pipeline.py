# -*- coding: utf-8 -*-
"""
Pipeline: Cours SE.pdf (436 pages) -> js/data-cours.js
- Extrait 100% des pages (aucune omission, vérification 436/436).
- Nettoie uniquement les en-têtes/pieds répétés + supprime identité prof/université.
- Structure en 3 chapitres / 48 sections avec explications arabes + glossaire.
"""
import base64
import json
import re
import unicodedata
from pathlib import Path

import pymupdf

BASE = Path(__file__).resolve().parents[2]           # ...\Système d_Exploitation_1
PDF = BASE / "Cours" / "Cours SE.pdf"
OUT = Path(__file__).resolve().parents[1] / "js" / "data-cours.js"

# Marqueurs d'identité à retirer du support. Encodés pour qu'aucun nom
# n'apparaisse en clair dans les fichiers livrés.
_FORBIDDEN_B64 = [
    "bGFobWlkaQ==",
    "Y2hvdWHDr2I=",
    "Y2hvdWFpYg==",
    "cG9seWRpc2NpcGxpbmFpcmU=",
    "c2lkaSBiZW5ub3Vy",
    "cHIuIGxhaG1pZGk=",
    "YXlvdWI=",
]
FORBIDDEN = [base64.b64decode(x).decode("utf-8") for x in _FORBIDDEN_B64]

# ---------------------------------------------------------------------------
# Métadonnées des sections : (début, fin, titre FR, titre AR, explication AR, glossaire)
# Les plages sont contiguës et couvrent exactement 1..436.
# ---------------------------------------------------------------------------
SECTIONS = [
    # ============================ CHAPITRE 1 ============================
    (1, 8, "Présentation du module & objectifs", "تقديم المادة والأهداف",
     "نظام التشغيل الوسيط بين المستخدم وعتاد الحاسوب: يدير المعالج والذاكرة والملفات والأجهزة ويجعل استعمالها أسهل. ستتعلّم على ثلاث خطوات: مبادئ أنظمة التشغيل، ثم أهم أوامر Unix، ثم كتابة سكربتات Shell. التقييم: 80% امتحان نهائي + 20% أعمال تطبيقية (TP). الحجم الساعي: 24h درس + 12h تمارين موجهة + 10h تطبيقات. المطلوب سابقًا: معمارية الحاسوب والبرمجة (الحلقات، الشروط، المصفوفات، تسيير الذاكرة).",
     [("Volume horaire", "الحجم الساعي"), ("Prérequis", "المتطلبات السابقة"), ("Examen final", "الامتحان النهائي"), ("TP", "الأعمال التطبيقية")]),

    (9, 18, "Le système informatique & l'architecture matérielle", "النظام المعلوماتي والمعمارية المادية",
     "الحاسوب = عتاد (Hardware: المعالج CPU، الذاكرة RAM، القرص، اللوحة الأم، الأطراف) + برمجيات (Software: أنظمة التشغيل والتطبيقات). اللوحة الأم تضم المعالج، RAM (ذاكرة متطايرة تفقد محتواها عند انقطاع الكهرباء)، ROM (تحتوي BIOS)، الساعة، النواقل bus والـ chipset. المعالج يتكون من: سجلات registers، ساعة، ناقل داخلي، وحدة تحكم UCC (تجلب وتفكك وتشرف على تنفيذ التعليمات)، ووحدة حسابية منطقية UAL. كل نبضة ساعة = تنفيذ تعليمة.",
     [("Hardware", "العتاد"), ("Software", "البرمجيات"), ("CPU", "المعالج"), ("RAM", "الذاكرة الحية"), ("ROM", "الذاكرة الميتة"), ("Bus", "الناقل"), ("Chipset", "شريحة التحكم"), ("UAL", "الوحدة الحسابية والمنطقية"), ("UCC", "وحدة التحكم")]),

    (19, 28, "Le système d'exploitation : rôle et services", "نظام التشغيل: الدور والخدمات",
     "نظام التشغيل برنامج وسيط بين المستخدم/التطبيقات والعتاد. له وجهان: (1) آلة موسّعة أو افتراضية تخفي تعقيد العتاد وتقدم واجهة بسيطة عبر نداءات النظام system calls وأوامر shell؛ (2) مدير موارد يجدول ويوزع المعالج والذاكرة وأجهزة الإدخال/الإخراج. أهدافه: تنفيذ برامج المستخدم، تسهيل الاستخدام، والاستغلال الفعّال للعتاد. خدماته: تحرير/ترجمة/تنقيح البرامج، التحميل في الذاكرة، إدارة E/S والملفات، الحماية وحل تعارضات الموارد.",
     [("SE / OS", "نظام التشغيل"), ("Machine virtuelle", "الآلة الافتراضية"), ("Gestionnaire de ressources", "مدير الموارد"), ("Appel système", "نداء النظام"), ("Ordonnancement", "الجدولة")]),

    (29, 36, "Composants & structure externe du SE", "مكونات نظام التشغيل وبنيته الخارجية",
     "مكونات النظام: النواة kernel (إدارة المهام، الذاكرة، الملفات، الأجهزة)، الـ Shell، نظام الملفات FS، والتعريفات drivers. البنية الخارجية: المجدول ordonnanceur (يقطع العملية بعد انتهاء وقتها أو عند انتظار E/S)، مدير الملفات (يخفي خصائص الأقراص عبر مفهوم الملف)، مدير الأجهزة (أوامر، مقاطعات، أخطاء)، مدير الذاكرة (تتبع الحر/المحجوز، التخصيص، الـ swapping)، ومحمّل SE الذي يشتغل بعد BIOS لتحميل النواة.",
     [("Noyau (kernel)", "النواة"), ("Ordonnanceur", "المجدول"), ("Gestionnaire de mémoire", "مدير الذاكرة"), ("Chargeur", "المحمّل"), ("Pilote (driver)", "تعريف الجهاز"), ("Swapping", "التبديل بين الذاكرة والقرص")]),

    (37, 41, "Les principaux systèmes d'exploitation", "أهم أنظمة التشغيل",
     "MS-DOS: من أوائل أنظمة PC، أحادي المستخدم وأحادي المهمة. Mac OS: من Apple منذ 1984. Unix: 1969، وُزّع مجانًا فظهرت إصدارات: System V (AT&T/Bell Labs)، BSD (Berkeley)، SCO، Solaris (Sun)، HP-UX، IBM AIX. Linux: بديل حر متعدد المستخدمين والمهام، توزيعات مثل RHEL وDebian وUbuntu. Windows: من 3.1 وNT إلى 95/98/2000/XP/Vista/7/8/10/11 — احفظ التسلسل الزمني.",
     [("Mono-utilisateur", "أحادي المستخدم"), ("Mono-tâche", "أحادي المهمة"), ("Multi-utilisateur", "متعدد المستخدمين"), ("Multi-tâche", "متعدد المهام"), ("Distribution", "توزيعة")]),

    (42, 50, "Unix, logiciels libres & licence GPL", "يونكس، البرمجيات الحرة ورخصة GPL",
     "Unix متعدد المستخدمين (هويات وأذونات)، متعدد المهام (تقسيم الوقت)، ومتعدد المنصات. بنيته: نواة + أدوات (shells وأوامر ملفات) + قاعدة بيانات نظام. البرمجيات الحرة تعطي 4 حريات: التنفيذ، الدراسة والتعديل، إعادة التوزيع، والتحسين — مع الوصول إلى الشيفرة المصدرية. GPL تعتمد copyleft لحماية هذه الحريات. Linux نواة أنشأها Linus Torvalds سنة 1991، مجانية، وهي clone لـ Unix وليست Unix: اسم Unix محمي بحقوق نشر بينما Linux حر.",
     [("Logiciel propriétaire", "برنامج ملكي/مغلق"), ("Logiciel libre", "برنامج حر"), ("Copyleft", "حقوق النسخ العكسية"), ("GPL", "رخصة GNU العامة"), ("Open Source", "مفتوح المصدر")]),

    (51, 55, "Dual boot, GRUB & séquence de démarrage", "الإقلاع المزدوج وGRUB وتسلسل الإقلاع",
     "يمكن تثبيت نظامين على نفس الحاسوب (dual boot). بعد الإقلاع يظهر محمّل الإقلاع Boot Loader واسمه GRUB ليختار المستخدم بين Windows وLinux، ويشغّل النظام الافتراضي تلقائيًا بعد بضع ثوانٍ. التسلسل: التشغيل ← BIOS (من ROM) ← تحميل قطاع الإقلاع ← GRUB ← تحميل نواة النظام ← shell.",
     [("Boot loader", "محمل الإقلاع"), ("GRUB", "محمل إقلاع GNU"), ("Dual boot", "إقلاع مزدوج"), ("BIOS", "نظام الإدخال/الإخراج الأساسي"), ("Noyau", "النواة")]),

    (56, 73, "GNU/Linux, distributions & Ubuntu", "GNU/Linux والتوزيعات وأوبونتو",
     "مشروع GNU أسّسه Richard Stallman سنة 1984 لبناء نظام حر شبيه بـ Unix. اندماج أدوات GNU مع نواة Linux أنتج GNU/Linux. التوزيعة = حزمة تجمع النواة والأدوات والتطبيقات ومدير الحزم، وتختلف في طريقة التثبيت والبرامج الافتراضية. Ubuntu (2004، مبنية على Debian، ومعناها «الإنسانية») توجد بنسخ متعددة (standard, education, Kubuntu, Xubuntu, netbook, mini…)، وترقيم إصداراتها سنة.شهر مثل 4.10 و5.04. طرق التثبيت: live بدون تثبيت، نظام وحيد، داخل Windows، أو تعايش dual boot.",
     [("Distribution", "توزيعة"), ("Live", "نسخة تجريبية بدون تثبيت"), ("Partition", "قسم القرص"), ("GNU/Linux", "نظام جنو/لينكس")]),

    # ============================ CHAPITRE 2 ============================
    (74, 91, "Shell, terminal & format des commandes", "الشيل والطرفية وصيغة الأوامر",
     "الـ Shell مفسّر أوامر: إما تفاعلي (prompt ثم أوامر) أو عبر سكربتات. الصيغة العامة: commande [-options] [arguments]. قواعد مهمة: Unix حساس لحالة الأحرف (ls ≠ LS)، المسافة تفصل الكلمات، الخيارات تسبق الوسائط ويمكن تجميعها (-la)، و-- ينهي الخيارات. الأوامر الداخلية builtin مثل cd وecho وpwd، والخارجية ملفات تنفيذية مثل ls وcat — تحددها type -t. للمساعدة: man، --help، help. الدليل $ لمستخدم عادي و# لـ root. اختصارات: Tab للإكمال، ↑ للتاريخ، Ctrl+C للإيقاف، Ctrl+Z للتعليق، Ctrl+L للمسح.",
     [("Shell", "مفسر الأوامر"), ("Prompt", "دعوة الأوامر"), ("Option", "خيار"), ("Argument", "وسيط"), ("Builtin", "أمر داخلي"), ("Commande externe", "أمر خارجي")]),

    (92, 114, "Gestion des fichiers & arborescence", "إدارة الملفات وشجرة المجلدات",
     "نظام الملفات شجرة واحدة تبدأ من الجذر /. كل شيء ملف حتى الأجهزة. المجلد حاوية، والملف مجموعة بيانات تحت اسم. المسار المطلق يبدأ بـ /، والنسبي ينطلق من المجلد الحالي؛ . هو المجلد الحالي، .. الأب، و~ المجلد الشخصي. أوامر: pwd (الموقع)، cd (التنقل)، ls (العرض مع -l للتفاصيل و-a للمخفي)، mkdir/rmdir، du (حجم شجرة)، touch. الرموز * ? [a-z] توسّعها القشرة قبل تنفيذ الأمر.",
     [("Répertoire", "مجلد"), ("Chemin absolu", "مسار مطلق"), ("Chemin relatif", "مسار نسبي"), ("Arborescence", "شجرة المجلدات"), ("Tilde ~", "رمز المجلد الشخصي")]),

    (115, 119, "Inodes, types & données des fichiers", "عقد الفهرس وأنواع الملفات وبياناتها",
     "الملف في Unix = بيانات + i-node: بنية تخزن الميتاداتا (النوع، الأذونات، المالك، المجموعة، الحجم، التواريخ، ومؤشرات الكتل) ورقمًا فريدًا. اسم الملف مجرد مدخل في جدول يربط الاسم بالـ inode، لذلك يمكن عدة أسماء لنفس inode. الأنواع: ملف عادي (-)، مجلد (d)، رابط (l)، إضافة إلى أنواع خاصة. لا تُحذف البيانات فعليًا إلا عند حذف آخر رابط.",
     [("Inode", "عقدة الفهرس"), ("Métadonnées", "البيانات الوصفية"), ("Lien", "رابط"), ("Bloc", "كتلة")]),

    (120, 135, "Commandes d'accès & manipulation", "أوامر الوصول والتعامل مع الملفات",
     "ls للعرض، cp للنسخ (cp src dst، cp fichier dossier/، cp -r للمجلدات)، mv للنقل أو إعادة التسمية (نسخ + حذف)، rm للحذف (-r للمجلد، -i للتأكيد، -f للفرض). touch تنشئ ملفًا فارغًا أو تحدّث تاريخه. find تبحث بالخصائص مثل find /home -name '*.c'، وlocate تبحث عبر قاعدة بيانات محدثة. الحذر من rm -rf لأنه لا يسترجع.",
     [("Copier", "نسخ"), ("Déplacer", "نقل"), ("Supprimer", "حذف"), ("Rechercher", "بحث"), ("Récursif", "متكرر")]),

    (136, 140, "Liens physiques & symboliques", "الروابط الصلبة والرمزية",
     "الرابط الصلب (ln f1 f2) اسم إضافي لنفس inode: نفس البيانات، يبقى بعد حذف الاسم الأصلي، ولا يعبر أنظمة الملفات ولا يصلح للمجلدات. الرابط الرمزي (ln -s cible lien) ملف صغير يحوي مسار الهدف: يصبح معطوبًا إذا حُذف الهدف، ويصلح للمجلدات والعبور بين الأنظمة. للمقارنة اعتمد: inode، سلوك الحذف، المجلدات، والأنظمة.",
     [("Lien physique", "رابط صلب"), ("Lien symbolique", "رابط رمزي"), ("Inode partagé", "عقدة مشتركة")]),

    (141, 153, "Lecture & filtrage de fichiers", "قراءة الملفات وتصفيتها",
     "cat للعرض والدمج، head/tail لأول/آخر 10 أسطر (-n للعدد)، cut لاستخراج الحقول (-d الفاصل، -f الحقل) أو المحارف (-c)، sort للترتيب (-n رقمي، -r عكسي)، uniq لإزالة التكرار المتتالي (-c للعد)، wc للعد (-l أسطر، -w كلمات، -c محارف)، tr للترجمة/الحذف، diff للمقارنة، paste للدمج، echo للطباعة، which لمسار أمر. تُركّب عادة مع الأنابيب.",
     [("Filtre", "مرشح"), ("Trier", "ترتيب"), ("Compter", "عد"), ("Comparer", "مقارنة")]),

    (154, 157, "Commandes système & identification", "أوامر النظام والهوية",
     "uname تعرض معلومات النظام والنواة، su لتبديل المستخدم، sudo لتنفيذ أمر بصلاحيات root، whoami/id/groups لهوية المستخدم، hostname لاسم الآلة، date/cal للتاريخ، reboot/shutdown للإعادة/الإطفاء. تذكّر الدليل: $ عادي و# root.",
     [("Super-utilisateur", "المستخدم الخارق"), ("Identité", "الهوية"), ("Noyau", "النواة")]),

    (158, 165, "Expressions régulières", "التعابير النمطية",
     "التعبير النمطي نمط يصف سلاسل محارف: . أي محرف، * صفر أو أكثر من المحرف السابق، + واحد أو أكثر، ? اختياري، ^ بداية السطر، $ نهايته، [abc] أحد المحارف، [a-z] نطاق، [^..] نفي، {n,m} تكرار، | بديل، () تجميع، \\ هروب. لا تخلطها مع wildcards القشرة: هناك * تعني أي سلسلة أسماء، وهنا تعني تكرار المحرف السابق.",
     [("Expression régulière", "تعبير نمطي"), ("Motif", "نمط"), ("Métacaractère", "محرف خاص")]),

    (166, 179, "grep, find & alias (exercices)", "grep وfind والاسم المستعار (تمارين)",
     "grep تبحث داخل محتوى الملفات: grep motif fichier، -i تجاهل الحالة، -v عكس النتيجة، -n أرقام الأسطر، -c عد الأسطر، -r متكرر. find تبحث في الشجرة بالخصائص: -name، -type f/d، -user، -perm، -size، مع ! و-a و-o والأقواس. القاعدة: grep للمحتوى وfind للأسماء/الخصائص. alias تعرّف اختصارًا مثل alias ll='ls -l'. تدرّب أدناه: ابحث عن نمط داخل ملف، ثم عن ملفات *.c في شجرة كاملة.",
     [("Alias", "اسم مستعار"), ("Opérateur logique", "عامل منطقي"), ("Motif", "نمط")]),

    (180, 196, "Séparateurs conditionnels & redirections", "الفواصل الشرطية وإعادة التوجيه",
     "لكل عملية 3 قنوات: stdin=0، stdout=1، stderr=2. < إدخال من ملف، > إخراج مع استبدال، >> إلحاق، 2> للأخطاء، &> للكل، << here-document. الأنبوب | يمرر stdout كمدخل للأمر التالي مثل ls -l | wc -l. الفواصل: ; تعاقب دائمًا، && ينفّذ التالي فقط إذا نجح السابق، || إذا فشل. ترتيب الشروط وأقواس here-doc من نقاط الامتحان.",
     [("Entrée standard (stdin)", "الإدخال القياسي"), ("Sortie standard (stdout)", "الإخراج القياسي"), ("Erreur standard (stderr)", "الخطأ القياسي"), ("Pipe", "أنبوب"), ("Redirection", "إعادة توجيه"), ("Here-document", "مستند مضمّن")]),

    (197, 202, "Utilisateurs & groupes", "المستخدمون والمجموعات",
     "Linux متعدد المستخدمين؛ root يملك كل الصلاحيات. كل مستخدم له UID ومجموعة أساسية GID. كل ملف يُنسب إلى المالك User والمجموعة Group والآخرين Others. ملفات النظام: /etc/passwd للحسابات، /etc/shadow لكلمات السر المشفرة، /etc/group للمجموعات. المجلد الشخصي عادة /home/utilisateur. الأمان يمر عبر الأذونات.",
     [("Utilisateur", "مستخدم"), ("Groupe", "مجموعة"), ("UID", "معرف المستخدم"), ("GID", "معرف المجموعة"), ("Root", "الجذر")]),

    (203, 220, "Droits d'accès & chmod", "أذونات الوصول وchmod",
     "الأذونات: r=4 قراءة، w=2 كتابة، x=1 تنفيذ (وللمجلد: عبور). ثلاث فئات: u المالك، g المجموعة، o الآخرون. ls -l يعرض النوع ثم 9 خانات (rwx للمالك، ثم المجموعة، ثم الآخرين). بالثماني: chmod 755 = rwxr-xr-x، و644 = rw-r--r--. بالرمزي: chmod u+x، g-w، o=r، a=rw. أمثلة الامتحان المتكررة: 750، 664، 764 — رتّب الخانات دائمًا u ثم g ثم o.",
     [("Droit d'accès", "حق الوصول"), ("Permission", "إذن"), ("Octale", "ثماني"), ("Propriétaire", "المالك"), ("Groupe", "المجموعة"), ("Autres", "الآخرون")]),

    (221, 226, "chown, chgrp & umask", "chown وchgrp وumask",
     "chown تغيّر المالك (والمجموعة اختياريًا): chown user fichier، chown user:group fichier — وغالبًا root فقط. chgrp تغيّر المجموعة. umask تحدد الأذونات الافتراضية للملفات الجديدة: تُطرح من 666 للملفات ومن 777 للمجلدات؛ umask 022 يعطي ملفًا 644 ومجلدًا 755. تذكّر: umask قناع حجب وليست أذونات مباشرة.",
     [("Propriétaire", "المالك"), ("Masque umask", "قناع الأذونات"), ("Défaut", "افتراضي")]),

    (227, 234, "Gestion des comptes utilisateurs", "إدارة حسابات المستخدمين",
     "أوامر إدارة الحسابات (root): adduser/useradd للإنشاء، passwd لتغيير كلمة السر، deluser/userdel للحذف (لا يحذف المجلد الشخصي إلا مع -r/--remove-home)، addgroup/groupadd للمجموعات، usermod للتعديل (-l لتغيير الاسم، -G تستبدل المجموعات، -aG تضيف). su - للانتقال إلى root ثم exit للعودة. ظهور # في الدليل يعني أنك root.",
     [("Compte", "حساب"), ("Mot de passe", "كلمة السر"), ("Groupe secondaire", "مجموعة ثانوية"), ("Super-utilisateur", "المستخدم الخارق")]),

    (235, 244, "Archives avec tar", "الأرشيفات باستخدام tar",
     "tar تجمع الملفات في أرشيف (لا تضغط وحدها): -c إنشاء، -x استخراج، -t عرض المحتوى، -f اسم الأرشيف، -v تفصيلي، -z ضغط gzip (فتصبح -czf للإنشاء و-xzf للاستخراج)، -C للتغيير إلى مجلد الوجهة، -rf لإضافة عناصر، --delete للحذف من الأرشيف، --exclude لاستثناء نمط. أمثلة: tar -cf a.tar dir، tar -xzf a.tar.gz -C dest.",
     [("Archive", "أرشيف"), ("Compression", "ضغط"), ("Extraction", "استخراج"), ("gzip", "ضغط جنو")]),

    (245, 249, "Composition des commandes (; & () {})", "تركيب الأوامر (; & () {})",
     "الفاصلة ; تعاقب الأوامر دائمًا، و& تشغّل في الخلفية. الأقواس () تنفّذ في sous-shell فرعي، لذلك تغييرات cd داخلها لا تبقى بعدها؛ أما {} فتنفّذ في نفس الـ shell وتبقى التأثيرات. هذا فرق امتحاني شهير. && و|| شرطيتان حسب كود الخروج $? (0 = نجاح).",
     [("Sous-shell", "شيل فرعي"), ("Séquence", "تسلسل"), ("Arrière-plan", "الخلفية")]),

    (250, 271, "Contrôle des processus", "التحكم في العمليات",
     "العملية برنامج قيد التنفيذ. تتنفذ في المقدمة foreground (ينتظرها shell) أو الخلفية background بـ & مع رقم [n]. Ctrl+Z يعلّق، bg يواصل في الخلفية، fg يعيد للمقدمة، Ctrl+C يوقف، wait ينتظر الأبناء. ps -f يعرض UID PID PPID STIME TIME CMD، وSTAT: R تعمل، S نائمة، T موقوفة، Z زومبي. kill PID يرسل إشارة؛ kill -9 إجبار SIGKILL، و-15 SIGTERM، و-1 SIGHUP، و-2 SIGINT. عند خروج الأب تُقتل أبناؤه.",
     [("Processus", "عملية"), ("PID", "معرف العملية"), ("PPID", "معرف العملية الأب"), ("Signal", "إشارة"), ("Zombie", "عملية زومبي"), ("Foreground / Background", "المقدمة / الخلفية")]),

    (272, 277, "Éditeurs de texte sous Unix", "محررات النصوص في يونكس",
     "gedit محرر رسومي سهل في GNOME. nano بسيط في الطرفية. vi/vim هو الافتراضي وله وضعان: Normal (تنقل وأوامر) وInsertion (كتابة، تدخل بـ i/a/o). للخروج: Esc ثم :w للحفظ، :q للخروج، :wq للحفظ والخروج، :q! لتجاهل التعديلات. من أوامر vim: dd لحذف سطر، yy للنسخ، p للصق.",
     [("Éditeur de texte", "محرر نصوص"), ("Mode insertion", "وضع الإدخال"), ("Mode normal", "الوضع العادي")]),

    (278, 282, "Shells & variables d'environnement (intro)", "الشيلات ومتغيرات البيئة (مقدمة)",
     "من الشيلات: sh/Bourne، bash (Bourne Again)، csh/tcsh، ksh، zsh. عند بدء الشيل تُنفّذ ملفات تهيئة مثل .profile و.bashrc. متغيرات البيئة متغيرات ديناميكية مثل PATH وHOME وPS1 وTERM، تُورّث للعمليات؛ printenv/env تعرضها وexport تصدّرها.",
     [("Variable d'environnement", "متغير البيئة"), ("Fichier de configuration", "ملف الإعداد"), ("bash", "شيل بورن-again")]),

    # ============================ CHAPITRE 3 ============================
    (283, 286, "Le shell interpréteur & les types de commandes", "الشيل كمفسّر وأنواع الأوامر",
     "الـ Shell لغة برمجة كاملة: تفسير فوري، متغيرات، أوامر داخلية مدمجة (cd, echo, pwd, read, export, set) وأوامر خارجية ملفات (ls, sleep). الأمر type -t يحدد النوع (builtin أو file)، وps يعرض اسم الشيل الجاري، وbash --version نسخته.",
     [("Commande interne", "أمر داخلي"), ("Commande externe", "أمر خارجي"), ("Interpréteur", "مفسّر")]),

    (287, 292, "Les scripts shell", "سكربتات الشيل",
     "السكربت ملف نصي يحوي أوامر. السطر الأول #!/bin/bash (shebang) يحدد المفسر. التعليقات تبدأ بـ #. التفعيل: chmod u+x script ثم ./script، أو bash script. الامتداد .sh عرف وليس شرطًا. الأسماء بدون مسافات وحساسة لحالة الأحرف. جرّب الأمثلة مباشرة في الطرفية داخل الموقع.",
     [("Script", "سكربت"), ("Shebang", "محدد المفسر"), ("Commentaire", "تعليق"), ("Exécutable", "قابل للتنفيذ")]),

    (293, 299, "Paramètres & variables", "المعاملات والمتغيرات",
     "ثلاثة أنواع معاملات: متغيرات بأسماء، ثوابت، ومعاملات موضعية. التعيين بدون مسافات: x=5 (كتابة x = 5 خطأ). القراءة $x أو ${x}. bash غير نمطية: كل القيم نصوص. للدمج +=. declare -r أو readonly للثابت، وunset للحذف. الأقواس المفردة ' ' حرفية، والمزدوجة \" \" تفسّر المتغيرات والأوامر.",
     [("Variable", "متغير"), ("Affectation", "إسناد"), ("Concaténation", "دمج"), ("Constante", "ثابت")]),

    (300, 310, "read & saisie au clavier", "read والإدخال من لوحة المفاتيح",
     "read a b تقرأ سطرًا وتوزع الكلمات: الأولى إلى a والباقي إلى b. بدون متغيرات تُخزّن في REPLY. الخيارات: -p لرسالة، -n لعدد المحارف، -s صامت (كلمة سر)، -t لمهلة، -a لمصفوفة. إن كانت الكلمات أقل تُترك المتغيرات فارغة، وإن كانت أكثر يأخذ الأخير بقية السطر.",
     [("Saisie", "إدخال"), ("Prompt", "رسالة الدعوة"), ("REPLY", "المتغير الافتراضي")]),

    (311, 314, "Quotes, export & portée des variables", "الاقتباس والتصدير ونطاق المتغيرات",
     "المتغير محلي في الشيل الحالي؛ export يجعله متغير بيئة موروثًا للأبناء. التوريث أحادي الاتجاه: الأب يورّث الابن، والابن لا يؤثر في الأب. أدوات: declare -x، export -p، printenv. الأقواس المزدوجة تفسّر المتغيرات، والمفردة تمنع كل تفسير.",
     [("Exportation", "تصدير"), ("Portée", "نطاق"), ("Variable locale", "متغير محلي")]),

    (315, 320, "Variables d'environnement", "متغيرات البيئة",
     "متغيرات البيئة (بأحرف كبيرة) تُنشأ عند تشغيل النظام: HOME، USER، PATH (مسارات البحث عن الأوامر)، PWD، OLDPWD، SHELL، PS1/PS2، IFS (فواصل الكلمات)، TERM، UID. printenv/env للعرض، unset للحذف، وexport PATH=$PATH:/newdir للإضافة. احفظ دور PATH وIFS لأنهما يأتيان في الأسئلة.",
     [("PATH", "مسار البحث"), ("IFS", "فواصل الكلمات"), ("HOME", "المجلد الشخصي"), ("PS1", "شكل الدعوة")]),

    (321, 329, "Substitutions & paramètres positionnels", "الاستبدالات والمعاملات الموضعية",
     "المعاملات الموضعية: $0 اسم السكربت، $1..$9 الوسائط، و${10} بعد العاشر. $# عددها. $@ و$* كلها، والفرق عند التنصيص: \"$@\" تحافظ على حدود كل وسيط بينما \"$*\" تدمجهم بفاصل IFS. ${n} تمنع الغموض. set تثبت معاملات جديدة، وshift n يحذف الأوائل للمرور على الكل.",
     [("Paramètre positionnel", "معامل موضعي"), ("$#", "عدد الوسائط"), ("shift", "إزاحة الوسائط"), ("$@ / $*", "قائمة الوسائط")]),

    (330, 345, "Paramètres spéciaux, shift & substitution de commande", "المعاملات الخاصة وshift واستبدال الأوامر",
     "$? كود خروج آخر أمر (0 = نجاح)، $$ PID الشيل الحالي، $! PID آخر عملية خلفية. $(cmd) أو `cmd` يستبدل ناتج أمر: d=$(date +%d)، ومع set: set -- $(ls). يمكن التداخل والاستخدام داخل الأقواس المزدوجة. أمثلة نموذجية: taille=$(wc -c < fichier)، jour=$(date +%d)، uid=$(id -u)، mach=$(hostname).",
     [("Substitution de commande", "استبدال الأمر"), ("PID", "معرف العملية"), ("Code retour", "كود الخروج")]),

    (346, 355, "Paramètres non définis & unset", "المعاملات غير المعرّفة وحذف المتغيرات",
     "${var:-v} قيمة مؤقتة إذا كان غير معرّف أو فارغًا؛ ${var:=v} يعيّن فعليًا؛ ${var:?msg} يوقف بخطأ إن غاب؛ ${var:+v} بديل عند وجوده. set -o nounset يمنع غير المعرّف، وset +o nounset يرجع. unset يحذف المتغيرات (لا يعمل مع readonly).",
     [("Paramètre non défini", "معامل غير معرف"), ("unset", "حذف متغير"), ("nounset", "منع غير المعرّف")]),

    (356, 365, "Redirections & scripts", "إعادة التوجيه داخل السكربتات",
     "تذكير: > استبدال، >> إلحاق، 2> للأخطاء، &> للكل. noclobber (set -o noclobber) يمنع الاستبدال وتُكسر بـ >|. << لمستند متعدد الأسطر، و<<< لسطر واحد. الأنابيب داخل السكربتات قد تنشئ sous-shell، لذا استخدم إعادة التوجيه مع read لقراءة ملف سطرًا سطرًا.",
     [("Here-document", "مستند مضمّن"), ("Noclobber", "منع الاستبدال"), ("Tube", "أنبوب")]),

    (366, 373, "Tests de conditions", "اختبار الشروط",
     "test أو [ expr ] (المسافات إلزامية). $? = 0 يعني صحيحًا. مقارنة أرقام: -eq -ne -lt -le -gt -ge. نصوص: = != -z (فارغ) -n (غير فارغ). ملفات: -e وجود، -f عادي، -d مجلد، -r/-w/-x أذونات، -s غير فارغ، -L رابط. المنطق: ! و-a (و) و-o (أو)، أو && و|| داخل [[ ]].",
     [("Test", "اختبار"), ("Code retour", "كود الخروج"), ("Opérateur", "عامل")]),

    (374, 383, "Expressions arithmétiques", "التعابير الحسابية",
     "bash يعامل المتغيرات كنصوص؛ للحساب: (( x=2+3 )) ثم $((x*2))، ولا حاجة لـ $ داخل (( )). declare -i y يجعل y عددًا. expr يحسب مع مسافات و\\* مهرب، وlet كذلك. القسمة صحيحة و% تعطي الباقي. sleep توقف التنفيذ n ثانية. جرّب: echo $((7*2)) ثم echo $a بعد (( a=12/5 )).",
     [("Arithmétique", "حساب"), ("Entier", "عدد صحيح"), ("Expression", "تعبير")]),

    (384, 386, "Structure conditionnelle if", "بنية الشرط if",
     "if condition; then ...; elif ...; else ...; fi. الشرط أمر ينجح أو يفشل عبر $?، أو اختبار [ ]. أمثلة: if [ -f \"$1\" ]; then، if [ $# -ne 2 ]. لا تنسَ then، والمسافات داخل [ ]. يمكن استخدام if grep -q motif fichier مباشرة.",
     [("Condition", "شرط"), ("Branchement", "تفريع"), ("then / fi", "إذن / نهاية")]),

    (387, 391, "Choix multiples avec case", "الاختيار المتعدد case",
     "case $var in motif1) ...;; motif2|motif3) ...;; *) افتراضي;; esac. الأنماط تقبل * ? [a-z] و[[:upper:]]. ;; إلزامية لإنهاء كل فرع، و*) يلتقط كل ما لم يطابق. جرّب تصنيف حرف مقروء بـ read: حرف كبير، حرف صغير، رقم، ثم *.",
     [("Choix multiple", "اختيار متعدد"), ("Motif", "نمط"), ("esac", "نهاية case")]),

    (392, 397, "Boucles for", "حلقة for",
     "for x in liste; do ...; done حيث العناصر مفصولة بمسافات أو توسيع مثل *.c. الشكل العددي: for ((i=1;i<=5;i++)); do ...; done، ويقبل حلقة لا نهائية for (( ; ; )). استخدم $x داخل الحلقة، وجرّب مثال نسخ ملفات *.c.",
     [("Boucle", "حلقة"), ("Itération", "تكرار"), ("Liste", "قائمة")]),

    (398, 401, "Boucles while, until & break/continue", "حلقتا while وuntil وbreak/continue",
     "while [ cond ]; do ...; done تكرر ما دام الشرط صحيحًا، وuntil تعكسه (تكرر حتى يصبح صحيحًا). break يخرج من الحلقة، وcontinue يتخطى الدورة الحالية. احذر الحلقات اللانهائية: غيّر العدّاد داخل الجسم.",
     [("Tant que", "بينما"), ("Jusqu'à", "حتى"), ("break / continue", "خروج / تخطي")]),

    (402, 406, "select, options du shell & exec", "select وخيارات الشيل وexec",
     "select x in a b c; do ...; done يعرض قائمة مرقمة ويضع اختيار المستخدم في x (وREPLY). من خيارات set: -o vi/emacs، -x لتتبع التنفيذ، -v لعرض الأوامر، -n لفحص الصياغة دون تنفيذ. exec command يستبدل الشيل الحالي دون إنشاء عملية جديدة.",
     [("Menu", "قائمة"), ("Options du shell", "خيارات الشيل"), ("exec", "استبدال العملية")]),

    (407, 410, "La commande expr", "الأمر expr",
     "expr arg1 op arg2: حساب (+ - \\* / %)، مقارنة (= != \\< \\> \\<= \\>=)، منطق (\\| و\\&)، ومطابقة نصية expr \"$s\" : 'motif' ترجع طول المطابقة أو 0. المسافات إلزامية، و* و<> تحتاج هروبًا. الناتج يطبع على stdout ويُلتقط بـ $().",
     [("Expression", "تعبير"), ("Opérateur", "عامل"), ("Motif", "نمط")]),

    (411, 429, "Fonctions", "الدوال",
     "التعريف: function nom { ... } أو nom() { ... }. تُستدعى كأمر بدون (). تعمل في نفس الشيل فتتشارك المتغيرات. الوسائط $1.. و$#. return يرجع كودًا من 0 إلى 255 فقط؛ لإرجاع قيمة استخدم echo ثم $(). local لمتغير محلي. declare -F يعرض الدوال، unset -f يحذفها، export -f يورّثها، وsource يحمّلها من ملف.",
     [("Fonction", "دالة"), ("Argument", "وسيط"), ("Valeur de retour", "قيمة الإرجاع"), ("local", "متغير محلي")]),

    (430, 432, "Récursion & source", "الاستدعاء الذاتي وsource",
     "الدالة تستدعي نفسها (مثل factoriel) بشرط توقف واضح. source (أو .) يقرأ ملفًا داخل الشيل الحالي فتُعرّف متغيراته ودواله، عكس تنفيذ ./script الذي يعمل في عملية فرعية. بعد export -f تصبح الدوال مرئية في سكربتات أخرى.",
     [("Récursivité", "الاستدعاء الذاتي"), ("Source", "تحميل ملف"), ("Portée", "نطاق")]),

    (433, 436, "Les tableaux (arrays)", "الجداول (المصفوفات)",
     "tab=(a b c)؛ العنصر ${tab[0]} والفهرس يبدأ من 0؛ الطول ${#tab[*]} أو ${#tab[@]}؛ كل العناصر ${tab[*]}؛ الفهارس ${!tab[*]}. الإضافة tab+=(d). declare -A للجداول الترابطية: t[clé]=valeur ثم ${t[clé]}. تجربة سريعة: tab=(red green blue) ثم echo ${#tab[*]}.",
     [("Tableau", "جدول/مصفوفة"), ("Indice", "فهرس"), ("Tableau associatif", "جدول ترابطي")]),
]

CHAPTERS = [
    {"id": "ch1", "num": 1, "title": "Introduction aux systèmes d'exploitation",
     "ar": "مقدمة في أنظمة التشغيل",
     "introAr": "هذا الفصل يشرح ما هو نظام التشغيل، من أين جاء، وأي وظائف يؤدي بين المستخدم والعتاد. ستتعرف على مكونات الحاسوب، النواة، مدير الموارد، ثم تاريخ Unix/Linux والتوزيعات. ركّز على التعريفات الفرنسية لأنها تأتي حرفيًا في الامتحان.",
     "first": 1, "last": 73},
    {"id": "ch2", "num": 2, "title": "Les commandes de base Unix",
     "ar": "أوامر يونكس الأساسية",
     "introAr": "هذا الفصل هو قلب الامتحان العملي: أوامر Unix. ستحتاج حفظ الصيغة commande [-options] [arguments]، والتمييز بين المسارات المطلقة والنسبية، وأوامر الملفات والأذونات. تدرّب في الطرفية داخل الموقع لأن الأسئلة غالبًا من نوع «أعطِ الأمر المناسب».",
     "first": 74, "last": 282},
    {"id": "ch3", "num": 3, "title": "Programmation Shell",
     "ar": "برمجة الشيل",
     "introAr": "هذا الفصل يحوّلك من مستخدم أوامر إلى مبرمج Shell. ستكتب سكربتات، تتعامل مع المتغيرات والمعاملات، ثم التحكم في التدفق (if/case/for/while) والدوال والجداول. الأسئلة هنا غالبًا «اكتب سكربت» أو «صحّح سكربت» — طبّقها فورًا في Terminal.",
     "first": 283, "last": 436},
]

# ---------------------------------------------------------------------------
# Nettoyage du texte
# ---------------------------------------------------------------------------
BULLET = re.compile(r"^\s*(?:[➢❖✓✔▪•●◦–—]\s*|[oO]\s+|\d+[.)]\s*|[a-zA-Z]\)\s*)")
CODE_START = re.compile(r"^\s*(?:\$|%|#!)\s*\S")
HEADINGish = re.compile(r"^[A-Z0-9ÀÂÄÉÈÊËÎÏÔÖÙÛÜÇ'’\"()\-–—:,. /&+]{3,90}$")

COMMANDS = {
    "ls", "cd", "pwd", "mkdir", "rmdir", "touch", "cat", "echo", "cp", "mv", "rm",
    "head", "tail", "wc", "grep", "find", "sort", "uniq", "cut", "tr", "diff",
    "paste", "chmod", "chown", "chgrp", "whoami", "id", "groups", "date", "hostname",
    "du", "df", "file", "ln", "tar", "ps", "kill", "man", "history", "clear",
    "uname", "su", "sudo", "passwd", "adduser", "deluser", "usermod", "addgroup",
    "alias", "export", "declare", "unset", "set", "read", "shift", "source", "sleep",
    "expr", "let", "printf", "which", "locate", "jobs", "bg", "fg", "wait", "umask",
    "reboot", "shutdown", "top", "w", "who", "nice", "chmod", "chgrp",
}

def clean_line(s: str) -> str:
    s = unicodedata.normalize("NFC", s)
    s = s.replace("\u00a0", " ").replace("\t", " ")
    s = re.sub(r"\s+", " ", s).strip()
    return s

def is_noise(s: str) -> bool:
    low = s.lower()
    if any(f in low for f in FORBIDDEN):
        return True
    if re.fullmatch(r"\d{1,3}", s):
        return True
    bad = [
        "partie 1 : introduction", "2ème année ima", "2ème année – s3",
        "2025-2026",
    ]
    return any(b in low for b in bad)

def is_heading(s: str) -> bool:
    if len(s) < 3 or len(s) > 90:
        return False
    letters = [c for c in s if c.isalpha()]
    if len(letters) < 3:
        return False
    upper = sum(1 for c in letters if c.isupper()) / len(letters)
    return upper >= 0.75

def looks_code(s: str) -> bool:
    if CODE_START.match(s):
        return True
    parts = s.split()
    if not parts:
        return False
    first = parts[0].lower()
    if first not in COMMANDS:
        return False
    if s.endswith(('.', ':', '?', '!')):
        return False
    return (" -" in " " + s) or ("/" in s) or ("=" in s) or len(parts) <= 2

def ends_sentence(s: str) -> bool:
    return s.rstrip().endswith(('.', '!', '?', ';', ':', '»', '"', ')'))

def merge_blocks(lines):
    """Fusionne les lignes coupées du PDF en paragraphes lisibles."""
    blocks = []
    for line in lines:
        if is_noise(line):
            continue
        kind = "t"
        content = line
        if is_heading(line):
            kind = "h"
        elif BULLET.match(line):
            kind = "b"
            content = BULLET.sub("", line).strip()
        elif looks_code(line):
            kind = "c"
        elif line.endswith(":") and len(line) < 70:
            kind = "h"
        if kind in ("h", "c"):
            blocks.append([kind, content])
            continue
        if kind == "b":
            blocks.append(["b", content])
            continue
        # texte normal : fusion avec le bloc précédent (paragraphe ou puce)
        if blocks and blocks[-1][0] in ("t", "b") and not ends_sentence(blocks[-1][1]):
            prev = blocks[-1][1]
            if prev.endswith("-") and content[:1].islower():
                blocks[-1][1] = prev[:-1] + content
            elif content[:1].islower() or prev.endswith((",", "«")):
                blocks[-1][1] = prev + " " + content
            else:
                blocks.append(["t", content])
        else:
            blocks.append(["t", content])
    return [{"k": k, "v": v} for k, v in blocks if v.strip()]

def page_blocks(doc, n: int):
    page = doc[n - 1]
    text = page.get_text("text")
    lines = [clean_line(l) for l in text.split("\n")]
    lines = [l for l in lines if l]
    return merge_blocks(lines)

# ---------------------------------------------------------------------------
# Construction
# ---------------------------------------------------------------------------
def build():
    doc = pymupdf.open(PDF)
    total = len(doc)
    assert total == 436, f"Pages attendues 436, trouvées {total}"

    # vérifier la couverture exacte des sections
    covered = []
    for start, end, *_ in SECTIONS:
        covered.extend(range(start, end + 1))
    assert covered == list(range(1, total + 1)), "Les plages de sections ne couvrent pas 1..436 exactement"

    chapters = []
    chapters_meta = {c["id"]: c for c in CHAPTERS}
    sec_index = 0
    for ch in CHAPTERS:
        sections = []
        for start, end, fr, ar, ar_text, terms in SECTIONS:
            if not (ch["first"] <= start <= ch["last"]):
                continue
            pages = []
            for n in range(start, end + 1):
                blocks = page_blocks(doc, n)
                if blocks:
                    pages.append({"n": n, "blocks": blocks})
                else:
                    pages.append({"n": n, "blocks": []})
            sec_index += 1
            sections.append({
                "id": f"s{sec_index}",
                "fr": fr,
                "ar": ar,
                "arText": ar_text,
                "terms": [{"fr": a, "ar": b} for a, b in terms],
                "pages": pages,
                "pageCount": end - start + 1,
            })
        chapters.append({
            "id": ch["id"], "num": ch["num"], "title": ch["title"],
            "ar": ch["ar"], "introAr": ch["introAr"],
            "sections": sections,
        })

    data = {
        "meta": {
            "title": "Système d'Exploitation I",
            "brand": "Badr AI",
            "subtitle": "Plateforme interactive — Cours complet (436 pages)",
            "source": "Cours SE.pdf",
            "totalPages": total,
            "chapters": len(chapters),
            "sections": sec_index,
            "generated": "2026-10-28",
        },
        "chapters": chapters,
    }

    # vérifications
    pages_in_data = sum(len(p["pages"]) for c in chapters for s in c["sections"] for p in [s])
    pages_in_data = sum(len(s["pages"]) for c in chapters for s in c["sections"])
    assert pages_in_data == total, f"Pages dans data: {pages_in_data} != {total}"

    blob = json.dumps(data, ensure_ascii=False, separators=(",", ":"))
    low = blob.lower()
    for f in FORBIDDEN:
        if f in low:
            # Aucune tolérance : tout marqueur résiduel fait échouer le pipeline.
            raise AssertionError(f"Marqueur d'identité encore présent: {f}")

    OUT.parent.mkdir(parents=True, exist_ok=True)
    with open(OUT, "w", encoding="utf-8", newline="\n") as fh:
        fh.write("/* Généré automatiquement par tools/pipeline.py — ne pas éditer à la main. */\n")
        fh.write("window.COURS = ")
        fh.write(blob)
        fh.write(";\n")

    # rapport
    sizes = [len(s["pages"]) for c in chapters for s in c["sections"]]
    print(f"OK: {total} pages | {len(chapters)} chapitres | {sec_index} sections")
    print(f"Sections vides: {sizes.count(0)} | min pages/section: {min(sizes)}")
    print(f"Sortie: {OUT} ({OUT.stat().st_size/1024:.1f} Ko)")
    for c in chapters:
        print(f"  {c['title']}: {len(c['sections'])} sections, {sum(s['pageCount'] for s in c['sections'])} pages")

if __name__ == "__main__":
    build()
