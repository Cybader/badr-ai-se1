#!/usr/bin/env node
/* =========================================================
   Badr AI — SE1 · génération des pages HTML indexables
   - /cours/index.html  : plan du cours (48 sections)
   - /cours/sN.html     : une page par section (texte + arabe)
   - /qcm.html          : les 120 QCM corrigés (indexables)
   - /flashcards.html   : les 90 flashcards (indexables)
   - /sitemap.xml, /robots.txt, /404.html
   Aucune dépendance : Node + js/data-*.js.
   ========================================================= */
"use strict";

const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const SITE = (process.env.SITE_URL || "https://cybader.github.io/badr-ai-se1").replace(/\/+$/, "");
const BRAND = "Badr AI";
const LAST_MOD = "2026-10-28";

global.window = {};
eval(fs.readFileSync(path.join(ROOT, "js", "data-cours.js"), "utf8"));
eval(fs.readFileSync(path.join(ROOT, "js", "data-quiz.js"), "utf8"));
eval(fs.readFileSync(path.join(ROOT, "js", "data-flash.js"), "utf8"));
const COURS = global.window.COURS;
const QUIZ = global.window.QUIZ;
const FLASH = global.window.FLASH;
if (!COURS || !COURS.chapters) throw new Error("COURS introuvable dans js/data-cours.js");
if (!QUIZ || !QUIZ.questions) throw new Error("QUIZ introuvable dans js/data-quiz.js");
if (!FLASH || !FLASH.cards) throw new Error("FLASH introuvable dans js/data-flash.js");

const SECMETA = new Map();
const ALL = [];
for (const ch of COURS.chapters) {
  for (const sec of ch.sections) {
    const item = { ch, sec, idx: ALL.length };
    ALL.push(item);
    SECMETA.set(sec.id, item);
  }
}

function esc(s) {
  return String(s == null ? "" : s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
function plain(s) {
  return String(s == null ? "" : s).replace(/\s+/g, " ").trim();
}
function cut(s, n) {
  s = plain(s);
  if (s.length <= n) return s;
  const sliced = s.slice(0, n - 1);
  const at = sliced.lastIndexOf(" ");
  return (at > n * 0.6 ? sliced.slice(0, at) : sliced).trim() + "…";
}
function pageRange(sec) {
  if (!sec.pages.length) return "—";
  return sec.pages[0].n + "–" + sec.pages[sec.pages.length - 1].n;
}
function canonicalSection(sec) {
  return SITE + "/cours/" + sec.id + ".html";
}
function pageTitle(sec) {
  return sec.fr + " — SE1 | " + BRAND;
}
function pageDesc(sec) {
  return cut(
    "Cours SE1 : " + sec.fr + " (pages " + pageRange(sec) + "). " +
    sec.ar + " — explications en arabe, révision en français, QCM et examen blanc.",
    158
  );
}
function pageKeywords(sec, ch) {
  const terms = (sec.terms || []).map(function (t) { return t.fr; });
  return [
    "Système d'Exploitation 1", "SE1", "cours SE1", sec.fr,
    ch ? ch.title : "Unix et Shell", "Unix", "Shell", "QCM", "examen", "شرح عربي", "أنظمة التشغيل"
  ].concat(terms).filter(Boolean).join(", ");
}
function jsonLd(obj) {
  return JSON.stringify(obj).replace(/</g, "\\u003c");
}

function head(opts) {
  const title = opts.title;
  const desc = opts.description;
  const url = opts.url;
  const image = SITE + "/assets/og-image.png";
  const prefix = opts.prefix == null ? "../" : opts.prefix;
  const ld = opts.ld ? '\n<script type="application/ld+json">\n' + jsonLd(opts.ld) + "\n</script>" : "";
  return '<!DOCTYPE html>\n' +
'<html lang="fr" dir="ltr">\n' +
'<head>\n' +
'<meta charset="UTF-8">\n' +
'<meta name="viewport" content="width=device-width, initial-scale=1.0">\n' +
'<title>' + esc(title) + '</title>\n' +
'<meta name="description" content="' + esc(desc) + '">\n' +
'<meta name="keywords" content="' + esc(opts.keywords || "Système d'Exploitation 1, SE1, cours Unix, QCM, شرح عربي") + '">\n' +
'<meta name="author" content="' + BRAND + '">\n' +
'<meta name="robots" content="' + (opts.noindex ? "noindex,follow" : "index,follow,max-image-preview:large,max-snippet:-1") + '">\n' +
'<meta name="theme-color" content="#070b18">\n' +
'<meta name="color-scheme" content="dark">\n' +
'<link rel="canonical" href="' + esc(url) + '">\n' +
'<meta property="og:type" content="' + (opts.ogType || "article") + '">\n' +
'<meta property="og:site_name" content="' + BRAND + '">\n' +
'<meta property="og:locale" content="fr_FR">\n' +
'<meta property="og:locale:alternate" content="ar_MA">\n' +
'<meta property="og:title" content="' + esc(opts.ogTitle || title) + '">\n' +
'<meta property="og:description" content="' + esc(opts.ogDescription || desc) + '">\n' +
'<meta property="og:url" content="' + esc(url) + '">\n' +
'<meta property="og:image" content="' + image + '">\n' +
'<meta property="og:image:width" content="1200">\n' +
'<meta property="og:image:height" content="630">\n' +
'<meta property="og:image:alt" content="Badr AI — Système d\'Exploitation 1">\n' +
'<meta name="twitter:card" content="summary_large_image">\n' +
'<meta name="twitter:title" content="' + esc(opts.ogTitle || title) + '">\n' +
'<meta name="twitter:description" content="' + esc(opts.ogDescription || desc) + '">\n' +
'<meta name="twitter:image" content="' + image + '">\n' +
'<link rel="icon" href="data:image/svg+xml,<svg xmlns=\'http://www.w3.org/2000/svg\' viewBox=\'0 0 100 100\'><rect rx=\'24\' width=\'100\' height=\'100\' fill=\'%237c5cff\'/><text x=\'50\' y=\'68\' font-size=\'58\' font-family=\'Segoe UI\' font-weight=\'700\' text-anchor=\'middle\' fill=\'white\'>B</text></svg>">\n' +
'<link rel="stylesheet" href="' + prefix + 'css/seo.css">\n' +
ld + '\n' +
'</head>\n' +
'<body>\n' +
'<a class="skip" href="#contenu">Aller au contenu</a>\n' +
headNav(prefix, opts.hubHref) +
'<div class="wrap">\n';
}

function headNav(prefix, hubHref) {
  prefix = prefix == null ? "../" : prefix;
  return '<header class="site-head">\n' +
  '<div class="head-in">\n' +
  '<a class="brand" href="' + prefix + 'index.html" aria-label="Badr AI — accueil">\n' +
  '<span class="b">B</span><span><b>Badr AI</b><small>Système d\'Exploitation 1</small></span>\n' +
  '</a>\n' +
  '<nav class="head-nav" aria-label="Navigation">\n' +
  '<a href="' + (hubHref || "index.html") + '">Plan du cours</a>\n' +
  '<a href="' + prefix + 'qcm.html">QCM corrigés</a>\n' +
  '<a href="' + prefix + 'flashcards.html">Flashcards</a>\n' +
  '<a href="' + prefix + 'index.html#terminal">Terminal</a>\n' +
  '<a href="' + prefix + 'index.html#exam">Examen</a>\n' +
  '</nav>\n' +
  '</div>\n' +
  '</header>\n';
}

function foot(prefix, hubHref) {
  prefix = prefix == null ? "../" : prefix;
  return '</div>\n' +
  '<footer class="site-foot">\n' +
  '<div><b>' + BRAND + '</b> · Système d\'Exploitation 1 (SE1) · 436 pages · explications en arabe, révision en français.</div>\n' +
  '<div><a href="' + prefix + 'index.html">Plateforme interactive</a> · <a href="' + (hubHref || "index.html") + '">Plan du cours</a> · <a href="' + prefix + 'qcm.html">120 QCM corrigés</a> · <a href="' + prefix + 'flashcards.html">90 flashcards</a> · <a href="' + prefix + 'index.html#exam">Examen blanc</a></div>\n' +
  '<div class="note">شرح بالعربية · Étude et examens en français · Site hors-ligne, sans compte.</div>\n' +
  '</footer>\n' +
  '</body>\n</html>\n';
}

function blockHTML(b) {
  const v = esc(b.v);
  if (b.k === "h") return "<h3>" + v + "</h3>";
  if (b.k === "c") return "<pre><code>" + v + "</code></pre>";
  if (b.k === "b") return '<p class="bullet">' + v + "</p>";
  return "<p>" + v + "</p>";
}

function pageHTML(pg) {
  const body = pg.blocks && pg.blocks.length
    ? pg.blocks.map(blockHTML).join("\n")
    : '<p class="page-empty">Diapositive sans texte — titre visuel du support original.</p>';
  return '<section class="page" aria-label="Page ' + pg.n + '">\n' +
    '<span class="page-tag">Page ' + pg.n + '</span>\n' +
    body + '\n</section>';
}

function termsHTML(sec) {
  if (!sec.terms || !sec.terms.length) return "";
  return '<div class="terms">\n' + sec.terms.map(function (t) {
    return '<div class="term"><b>' + esc(t.fr) + '</b><span lang="ar" dir="rtl">' + esc(t.ar) + '</span></div>';
  }).join("\n") + '\n</div>';
}

function sectionPage(item) {
  const ch = item.ch, sec = item.sec;
  const url = canonicalSection(sec);
  const first = sec.pages.length ? sec.pages[0].n : 0;
  const last = sec.pages.length ? sec.pages[sec.pages.length - 1].n : 0;
  const prev = ALL[item.idx - 1];
  const next = ALL[item.idx + 1];
  const siblings = ch.sections.filter(function (s) { return s.id !== sec.id; });
  const desc = pageDesc(sec);
  const ld = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "LearningResource",
        "@id": url + "#resource",
        "name": pageTitle(sec),
        "description": desc,
        "url": url,
        "inLanguage": ["fr", "ar"],
        "learningResourceType": "Cours",
        "educationalLevel": "Enseignement supérieur — Licence",
        "isAccessibleForFree": true,
        "provider": { "@type": "Organization", "name": BRAND, "url": SITE + "/" },
        "isPartOf": {
          "@type": "Course",
          "name": "Système d'Exploitation 1 (SE1)",
          "url": SITE + "/",
          "description": "Cours complet de Système d'Exploitation 1 : Unix et programmation Shell."
        },
        "about": ["Système d'exploitation", "Unix", "Programmation Shell", ch.title],
        "keywords": pageKeywords(sec, ch)
      },
      {
        "@type": "BreadcrumbList",
        "itemListElement": [
          { "@type": "ListItem", "position": 1, "name": "Accueil", "item": SITE + "/" },
          { "@type": "ListItem", "position": 2, "name": "Plan du cours", "item": SITE + "/cours/" },
          { "@type": "ListItem", "position": 3, "name": "Chapitre " + ch.num + " — " + ch.title, "item": SITE + "/cours/#ch" + ch.num },
          { "@type": "ListItem", "position": 4, "name": sec.fr, "item": url }
        ]
      }
    ]
  };

  let html = head({
    title: pageTitle(sec),
    description: desc,
    keywords: pageKeywords(sec, ch),
    url: url,
    ogType: "article",
    ld: ld
  });

  html += '<nav class="crumbs" aria-label="Fil d\'Ariane">\n' +
    '<a href="../index.html">Accueil</a><span>›</span>' +
    '<a href="index.html">Cours SE1</a><span>›</span>' +
    '<a href="index.html#ch' + ch.num + '">Chapitre ' + ch.num + '</a><span>›</span>' +
    '<span aria-current="page">' + esc(sec.fr) + '</span>\n</nav>\n';

  html += '<main id="contenu">\n<article>\n';
  html += '<header class="hero">\n' +
    '<span class="badge">Chapitre ' + ch.num + ' · Section ' + (item.idx + 1) + '/48</span>\n' +
    '<h1>' + esc(sec.fr) + '</h1>\n' +
    '<p class="ar-title" lang="ar" dir="rtl">' + esc(sec.ar) + '</p>\n' +
    '<div class="meta-row">' +
      '<span class="chip">📄 Pages ' + first + '–' + last + '</span>' +
      '<span class="chip">' + sec.pages.length + ' pages</span>' +
      '<span class="chip">🇫🇷 Cours en français</span>' +
      '<span class="chip">📘 شرح بالعربية</span>' +
    '</div>\n</header>\n';

  html += '<section class="ar-panel" aria-labelledby="ar-title">\n' +
    '<h2 id="ar-title"> الشرح بالعربية</h2>\n' +
    '<p class="ar-text" lang="ar" dir="rtl">' + esc(sec.arText) + '</p>\n' +
    termsHTML(sec) + '\n</section>\n';

  html += '<div class="sec-head"><div><h2>Contenu du cours</h2>' +
    '<p>Pages ' + first + '–' + last + ' · texte intégral du support</p></div>' +
    '<span class="chip">Chapitre ' + ch.num + ' — ' + esc(ch.title) + '</span></div>\n';
  html += '<div class="pages">\n' + sec.pages.map(pageHTML).join("\n") + '\n</div>\n';

  html += '<nav class="pager" aria-label="Sections précédente et suivante">\n';
  html += prev
    ? '<a class="btn" href="' + prev.sec.id + '.html">← ' + esc(cut(prev.sec.fr, 42)) + '</a>'
    : '<span></span>';
  html += next
    ? '<a class="btn" href="' + next.sec.id + '.html">' + esc(cut(next.sec.fr, 42)) + ' →</a>'
    : '<span></span>';
  html += '\n</nav>\n';

  html += '<aside class="cta">\n' +
    '<div><h2>Réviser cette section en interactif</h2>' +
    '<p>Ouvrez la plateforme Badr AI pour marquer la section comme lue, gagner des XP et tester vos connaissances avec les QCM et l\'examen blanc.</p></div>\n' +
    '<div class="cta-actions">' +
      '<a class="btn btn-primary" href="../index.html#cours/' + sec.id + '">Ouvrir la plateforme</a>' +
      '<a class="btn btn-soft" href="../qcm.html">120 QCM corrigés</a>' +
      '<a class="btn" href="../index.html#exam">Examen blanc</a>' +
    '</div>\n</aside>\n';

  if (siblings.length) {
    html += '<section class="related" aria-labelledby="related-title">\n' +
      '<h2 id="related-title">Autres sections du chapitre ' + ch.num + ' — ' + esc(ch.title) + '</h2>\n<ul>\n' +
      siblings.map(function (s) {
        return '<li><a href="' + s.id + '.html">' + esc(s.fr) + ' <span lang="ar" dir="rtl">— ' + esc(s.ar) + '</span></a></li>';
      }).join("\n") + '\n</ul>\n</section>\n';
  }

  html += '</article>\n</main>\n';
  html += foot();
  return html;
}

function hubPage() {
  const url = SITE + "/cours/";
  const desc = "Plan du cours SE1 : 48 sections, 436 pages — introduction, commandes Unix et programmation Shell. Explications en arabe, révision en français.";
  const ld = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "CollectionPage",
        "@id": url + "#page",
        "name": "Cours Système d'Exploitation 1 (SE1) — 48 sections",
        "description": desc,
        "url": url,
        "inLanguage": ["fr", "ar"],
        "isPartOf": {
          "@type": "Course",
          "name": "Système d'Exploitation 1 (SE1)",
          "url": SITE + "/",
          "provider": { "@type": "Organization", "name": BRAND }
        },
        "mainEntity": {
          "@type": "ItemList",
          "numberOfItems": ALL.length,
          "itemListElement": ALL.map(function (it) {
            return {
              "@type": "ListItem",
              "position": it.idx + 1,
              "name": it.sec.fr,
              "url": canonicalSection(it.sec)
            };
          })
        }
      },
      {
        "@type": "BreadcrumbList",
        "itemListElement": [
          { "@type": "ListItem", "position": 1, "name": "Accueil", "item": SITE + "/" },
          { "@type": "ListItem", "position": 2, "name": "Plan du cours", "item": url }
        ]
      }
    ]
  };

  let html = head({
    title: "Cours Système d'Exploitation 1 (SE1) — 48 sections | " + BRAND,
    description: desc,
    keywords: "Système d'Exploitation 1, SE1, cours Unix, commandes Unix, programmation Shell, chmod, QCM SE1, examen, شرح عربي, أنظمة التشغيل 1",
    url: url,
    ogType: "website",
    ld: ld
  });

  html += '<nav class="crumbs" aria-label="Fil d\'Ariane">' +
    '<a href="../index.html">Accueil</a><span>›</span><span aria-current="page">Plan du cours</span></nav>\n';

  html += '<main id="contenu">\n';
  html += '<header class="hero">\n' +
    '<span class="badge">Cours complet · 436 pages · 48 sections</span>\n' +
    '<h1>Cours Système d\'Exploitation 1 (SE1)</h1>\n' +
    '<p class="ar-title" lang="ar" dir="rtl">أنظمة التشغيل 1 — شرح عربي مبسّط ومراجعة بالفرنسية</p>\n' +
    '<p style="margin:12px 0 0;color:var(--muted);max-width:760px">Du rôle du système d\'exploitation aux commandes Unix et à la programmation Shell : chaque section contient le texte du cours en français, un résumé en arabe, les termes techniques et un accès direct à la plateforme interactive.</p>\n' +
    '<div class="meta-row">' +
      '<span class="chip">📚 3 chapitres</span>' +
      '<span class="chip">🧩 48 sections</span>' +
      '<span class="chip">✅ 120 QCM</span>' +
      '<span class="chip">💻 16 missions Unix</span>' +
      '<span class="chip">⏱ Examen 30 min</span>' +
    '</div>\n</header>\n';

  html += '<div class="cta">\n' +
    '<div><h2>Prêt à réviser ?</h2><p>La plateforme interactive ajoute la progression, les XP, les flashcards et le terminal Unix virtuel. Elle fonctionne aussi hors-ligne.</p></div>\n' +
    '<div class="cta-actions"><a class="btn btn-primary" href="../index.html">Ouvrir la plateforme</a><a class="btn btn-soft" href="../qcm.html">120 QCM corrigés</a><a class="btn" href="../flashcards.html">90 flashcards</a></div>\n' +
    '</div>\n';

  html += '<div class="sec-head"><div><h2>Programme complet</h2><p>Cliquez sur une section pour lire la page HTML indexable.</p></div><span class="chip">436 pages</span></div>\n';
  for (const ch of COURS.chapters) {
    const first = ch.sections[0];
    const last = ch.sections[ch.sections.length - 1];
    const pages = first.pages.length && last.pages.length
      ? first.pages[0].n + "–" + last.pages[last.pages.length - 1].n
      : "";
    html += '<section class="chapter" id="ch' + ch.num + '" aria-labelledby="ch' + ch.num + '-title">\n' +
      '<div class="chapter-head">' +
        '<span class="chapter-num">0' + ch.num + '</span>' +
        '<div><h2 id="ch' + ch.num + '-title">Chapitre ' + ch.num + ' — ' + esc(ch.title) + '</h2>' +
        '<div class="note">' + ch.sections.length + ' sections · pages ' + pages + '</div></div>' +
        '<span class="ar" lang="ar" dir="rtl">' + esc(ch.ar) + '</span>' +
      '</div>\n<div class="sec-list">\n' +
      ch.sections.map(function (s) {
        return '<a class="sec-link" href="' + s.id + '.html">' +
          '<b>' + esc(s.fr) + '</b>' +
          '<span class="arn" lang="ar" dir="rtl">' + esc(s.ar) + '</span>' +
          '<small>Pages ' + pageRange(s) + ' · ' + s.pages.length + ' pages</small></a>';
      }).join("\n") + '\n</div>\n</section>\n';
  }

  html += '<section class="related" aria-labelledby="method-title">\n' +
    '<h2 id="method-title">Méthode de révision</h2>\n' +
    '<ul>' +
      '<li><a href="../index.html#cours/s1"><b>1.</b> Comprendre chaque section en arabe, puis relire le texte français.</a></li>' +
      '<li><b>2.</b> S\'entraîner avec les <a href="../qcm.html">120 QCM corrigés</a> et les <a href="../flashcards.html">90 flashcards</a>.</li>' +
      '<li><a href="../index.html#terminal"><b>3.</b> Pratiquer les commandes Unix dans le terminal virtuel (16 missions).</a></li>' +
      '<li><a href="../index.html#exam"><b>4.</b> Se tester avec l\'examen blanc chronométré de 20 questions.</a></li>' +
    '</ul>\n</section>\n';

  html += '<section class="ar-panel" style="margin-top:24px" aria-labelledby="ar-about">\n' +
    '<h2 id="ar-about">عن هذه المنصة</h2>\n' +
    '<p class="ar-text" lang="ar" dir="rtl">منصة <b>Badr AI</b> تجمع مقرر <b>أنظمة التشغيل 1</b> كاملًا (436 صفحة) في 48 قسمًا: مقدمة في أنظمة التشغيل، أوامر Unix الأساسية، وبرمجة Shell. لكل قسم شرح بالعربية ونص فرنسي وأسئلة تدريبية، مع محاكي طرفية وامتحان تجريبي. صُمّمت للطلبة الذين يدرسون بالعربية ويمتحنون بالفرنسية.</p>\n' +
    '</section>\n';

  html += '</main>\n' + foot();
  return html;
}

function notFoundPage() {
  const url = SITE + "/404.html";
  const desc = "Page introuvable sur la plateforme Badr AI — Système d'Exploitation 1.";
  let html = head({
    title: "Page introuvable | " + BRAND,
    description: desc,
    keywords: "Badr AI, SE1",
    url: url,
    ogType: "website",
    noindex: true,
    prefix: "",
    hubHref: "cours/"
  });
  html += '<main id="contenu"><section class="hero" style="text-align:center;padding:60px 26px">' +
    '<span class="badge">Erreur 404</span>' +
    '<h1>Cette page n\'existe pas</h1>' +
    '<p class="ar-title" lang="ar" dir="rtl">الصفحة غير موجودة — يمكنك العودة إلى خطة الدرس.</p>' +
    '<div class="meta-row" style="justify-content:center;margin-top:22px">' +
      '<a class="btn btn-primary" href="' + SITE + '/">Accueil</a>' +
      '<a class="btn" href="' + SITE + '/cours/">Plan du cours</a>' +
      '<a class="btn btn-soft" href="' + SITE + '/qcm.html">120 QCM corrigés</a>' +
    '</div></section></main>';
  html += foot("", "cours/");
  return html;
}

function chapterLabel(cat) {
  const ch = COURS.chapters.find(function (c) { return "ch" + c.num === cat; });
  return ch ? "Chapitre " + ch.num + " — " + ch.title : "Révision SE1";
}

function qcmPage() {
  const url = SITE + "/qcm.html";
  const desc = cut("120 QCM corrigés de SE1 avec réponses et explications en arabe : introduction aux systèmes d'exploitation, commandes Unix et programmation Shell. Préparez votre examen.", 158);
  const ld = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Quiz",
        "@id": url + "#quiz",
        "name": "120 QCM corrigés — Système d'Exploitation 1 (SE1)",
        "description": desc,
        "url": url,
        "inLanguage": ["fr", "ar"],
        "isAccessibleForFree": true,
        "educationalLevel": "Enseignement supérieur — Licence",
        "learningResourceType": "Quiz",
        "provider": { "@type": "Organization", "name": BRAND, "url": SITE + "/" },
        "about": ["Système d'exploitation", "Unix", "Programmation Shell", "SE1"],
        "audience": { "@type": "EducationalAudience", "educationalRole": "student" }
      },
      {
        "@type": "BreadcrumbList",
        "itemListElement": [
          { "@type": "ListItem", "position": 1, "name": "Accueil", "item": SITE + "/" },
          { "@type": "ListItem", "position": 2, "name": "QCM corrigés", "item": url }
        ]
      }
    ]
  };

  let html = head({
    title: "120 QCM corrigés — Système d'Exploitation 1 (SE1) | " + BRAND,
    description: desc,
    keywords: "QCM SE1, QCM Système d'Exploitation 1, QCM corrigés, QCM Unix, QCM Shell, examen SE1, révision SE1, أنظمة التشغيل 1, أسئلة QCM",
    url: url,
    ogType: "website",
    ld: ld,
    prefix: "",
    hubHref: "cours/"
  });

  html += '<nav class="crumbs" aria-label="Fil d\'Ariane">' +
    '<a href="index.html">Accueil</a><span>›</span>' +
    '<a href="cours/">Cours SE1</a><span>›</span>' +
    '<span aria-current="page">QCM corrigés</span></nav>\n';

  html += '<main id="contenu">\n';
  html += '<header class="hero">\n' +
    '<span class="badge">120 questions · correction en arabe</span>\n' +
    '<h1>120 QCM corrigés — Système d\'Exploitation 1</h1>\n' +
    '<p class="ar-title" lang="ar" dir="rtl">أسئلة QCM مع التصحيح والتعليل — أنظمة التشغيل 1</p>\n' +
    '<p style="margin:12px 0 0;color:var(--muted);max-width:760px">Tous les QCM du module SE1, classés par chapitre : introduction aux systèmes d\'exploitation, commandes Unix et programmation Shell. Chaque question affiche les quatre choix, la bonne réponse et une explication en arabe.</p>\n' +
    '<div class="meta-row">' +
      '<span class="chip">📚 3 chapitres</span>' +
      '<span class="chip">✅ 120 corrections</span>' +
      '<span class="chip">📘 شرح بالعربية</span>' +
      '<span class="chip">🎯 Niveau licence</span>' +
    '</div>\n</header>\n';

  html += '<aside class="cta">' +
    '<div><h2>Mode interactif : score, chronomètre et XP</h2>' +
    '<p>Répondez question par question, obtenez votre score sur 10 et suivez votre progression. Les corrections restent disponibles dans la plateforme.</p></div>' +
    '<div class="cta-actions"><a class="btn btn-primary" href="index.html#quiz">Lancer le quiz interactif</a><a class="btn" href="flashcards.html">90 flashcards</a></div>' +
    '</aside>\n';

  html += '<div class="sec-head"><div><h2>Questions par chapitre</h2><p>Cliquez sur un chapitre pour y accéder directement.</p></div><span class="chip">120 questions</span></div>\n';
  html += '<div class="qjump">' + COURS.chapters.map(function (ch) {
    const n = QUIZ.questions.filter(function (q) { return q.cat === "ch" + ch.num; }).length;
    return '<a class="chip" href="#ch' + ch.num + '">Chapitre ' + ch.num + ' · ' + n + ' QCM</a>';
  }).join("") + '</div>\n';

  let n = 0;
  for (const ch of COURS.chapters) {
    const qs = QUIZ.questions.filter(function (q) { return q.cat === "ch" + ch.num; });
    html += '<section class="qcat" id="ch' + ch.num + '">\n' +
      '<div class="qcat-head">' +
        '<span class="chapter-num">0' + ch.num + '</span>' +
        '<div><h2>Chapitre ' + ch.num + ' — ' + esc(ch.title) + '</h2>' +
        '<div class="note">' + qs.length + ' QCM corrigés · ' + esc(ch.ar) + '</div></div>' +
      '</div>\n<div class="qlist">\n';
    html += qs.map(function (q) {
      n++;
      const letters = ["A", "B", "C", "D"];
      return '<article class="qcard" id="' + q.id + '">\n' +
        '<div class="qhead"><span class="qnum">' + String(n).padStart(2, "0") + '</span>' +
        '<span class="qtag">' + esc(chapterLabel(q.cat)) + '</span></div>\n' +
        '<h3 class="qtext">' + esc(q.q) + '</h3>\n' +
        '<ul class="qchoices">\n' + q.choices.map(function (c, j) {
          const ok = j === q.a;
          return '<li' + (ok ? ' class="ok"' : '') + '>' +
            '<span class="qletter">' + letters[j] + '</span>' +
            '<span class="qchoice">' + esc(c) + '</span>' +
            (ok ? '<span class="qok">Bonne réponse</span>' : '') + '</li>';
        }).join("\n") + '\n</ul>\n' +
        '<p class="qar" lang="ar" dir="rtl"><b>التصحيح:</b> ' + esc(q.ar) + '</p>\n' +
        '</article>';
    }).join("\n");
    html += '\n</div>\n</section>\n';
  }

  html += '<aside class="related" aria-label="Ressources complémentaires">\n' +
    '<h2>Continuer la révision</h2>\n<ul>' +
      '<li><a href="cours/">Relire les 48 sections du cours SE1</a></li>' +
      '<li><a href="flashcards.html">Mémoriser avec les 90 flashcards</a></li>' +
      '<li><a href="index.html#exam">Passer l\'examen blanc (20 questions · 30 min)</a></li>' +
      '<li><a href="index.html#terminal">Pratiquer les commandes Unix dans le terminal</a></li>' +
    '</ul>\n</aside>\n';
  html += '</main>\n' + foot("", "cours/");
  return html;
}

function flashPage() {
  const url = SITE + "/flashcards.html";
  const desc = cut("90 flashcards de révision SE1 : terminologie, commandes Unix et concepts, avec traductions en arabe. Révisez hors-ligne et préparez l'examen.", 158);
  const cardItems = FLASH.cards.map(function (c, i) {
    return {
      "@type": "ListItem",
      "position": i + 1,
      "name": c.front,
      "description": c.back
    };
  });
  const ld = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "CollectionPage",
        "@id": url + "#page",
        "name": "90 flashcards — Système d'Exploitation 1 (SE1)",
        "description": desc,
        "url": url,
        "inLanguage": ["fr", "ar"],
        "isPartOf": { "@type": "Course", "name": "Système d'Exploitation 1 (SE1)", "url": SITE + "/" },
        "mainEntity": {
          "@type": "ItemList",
          "numberOfItems": FLASH.cards.length,
          "itemListElement": cardItems
        }
      },
      {
        "@type": "BreadcrumbList",
        "itemListElement": [
          { "@type": "ListItem", "position": 1, "name": "Accueil", "item": SITE + "/" },
          { "@type": "ListItem", "position": 2, "name": "Flashcards", "item": url }
        ]
      }
    ]
  };

  let html = head({
    title: "90 flashcards SE1 — Réviser Unix & Shell | " + BRAND,
    description: desc,
    keywords: "flashcards SE1, cartes de révision, réviser SE1, terminologie Unix, commandes Unix, concepts systèmes d'exploitation, أنظمة التشغيل 1, بطاقات مراجعة",
    url: url,
    ogType: "website",
    ld: ld,
    prefix: "",
    hubHref: "cours/"
  });

  html += '<nav class="crumbs" aria-label="Fil d\'Ariane">' +
    '<a href="index.html">Accueil</a><span>›</span>' +
    '<a href="cours/">Cours SE1</a><span>›</span>' +
    '<span aria-current="page">Flashcards</span></nav>\n';

  html += '<main id="contenu">\n';
  html += '<header class="hero">\n' +
    '<span class="badge">90 cartes · 3 paquets</span>\n' +
    '<h1>90 flashcards — Réviser le Système d\'Exploitation 1</h1>\n' +
    '<p class="ar-title" lang="ar" dir="rtl">بطاقات مراجعة للمصطلحات وأوامر Unix والمفاهيم — أنظمة التشغيل 1</p>\n' +
    '<p style="margin:12px 0 0;color:var(--muted);max-width:760px">Terminologie français–arabe, commandes Unix et concepts clés du module SE1. Chaque carte donne la notion au recto et sa définition au verso, en arabe, pour réviser rapidement avant l\'examen.</p>\n' +
    '<div class="meta-row">' +
      '<span class="chip">🗂 90 cartes</span>' +
      '<span class="chip">🔁 Termes · commandes · concepts</span>' +
      '<span class="chip">📘 شرح بالعربية</span>' +
    '</div>\n</header>\n';

  html += '<aside class="cta">' +
    '<div><h2>Mode interactif : retourner, naviguer, mémoriser</h2>' +
    '<p>La plateforme affiche les cartes une par une, permet de les retourner et de marquer celles que vous maîtrisez.</p></div>' +
    '<div class="cta-actions"><a class="btn btn-primary" href="index.html#flash">Réviser en interactif</a><a class="btn" href="qcm.html">120 QCM corrigés</a></div>' +
    '</aside>\n';

  for (const deck of FLASH.decks) {
    const cards = FLASH.cards.filter(function (c) { return c.deck === deck.id; });
    html += '<section class="qcat" id="' + deck.id + '">\n' +
      '<div class="qcat-head">' +
        '<span class="chapter-num">' + String(cards.length).padStart(2, "0") + '</span>' +
        '<div><h2>' + esc(deck.name) + '</h2>' +
        '<div class="note">' + cards.length + ' cartes · <span lang="ar" dir="rtl">' + esc(deck.ar) + '</span></div></div>' +
      '</div>\n<div class="flash-grid">\n';
    html += cards.map(function (c) {
      return '<article class="flashcard">\n' +
        '<span class="flash-deck">' + esc(deck.name) + '</span>\n' +
        '<h3>' + esc(c.front) + '</h3>\n' +
        '<p class="flash-back" lang="ar" dir="rtl">' + esc(c.back) + '</p>\n' +
        (c.hint ? '<p class="flash-hint">Indice : ' + esc(c.hint) + '</p>' : '') +
        '</article>';
    }).join("\n");
    html += '\n</div>\n</section>\n';
  }

  html += '<aside class="related" aria-label="Ressources complémentaires">\n' +
    '<h2>Continuer la révision</h2>\n<ul>' +
      '<li><a href="cours/">Relire les 48 sections du cours SE1</a></li>' +
      '<li><a href="qcm.html">S\'entraîner avec les 120 QCM corrigés</a></li>' +
      '<li><a href="index.html#exam">Passer l\'examen blanc (20 questions · 30 min)</a></li>' +
    '</ul>\n</aside>\n';
  html += '</main>\n' + foot("", "cours/");
  return html;
}

function sitemap() {
  const entries = [
    { loc: SITE + "/", priority: "1.0", freq: "weekly" },
    { loc: SITE + "/cours/", priority: "0.9", freq: "weekly" },
    { loc: SITE + "/qcm.html", priority: "0.9", freq: "monthly" },
    { loc: SITE + "/flashcards.html", priority: "0.8", freq: "monthly" }
  ].concat(ALL.map(function (it) {
    return { loc: canonicalSection(it.sec), priority: "0.7", freq: "monthly" };
  }));
  return '<?xml version="1.0" encoding="UTF-8"?>\n' +
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
    entries.map(function (e) {
      return "  <url>\n" +
        "    <loc>" + esc(e.loc) + "</loc>\n" +
        "    <lastmod>" + LAST_MOD + "</lastmod>\n" +
        "    <changefreq>" + e.freq + "</changefreq>\n" +
        "    <priority>" + e.priority + "</priority>\n" +
        "  </url>";
    }).join("\n") + "\n</urlset>\n";
}

function robots() {
  return "User-agent: *\n" +
    "Allow: /\n" +
    "Disallow: /tools/\n" +
    "Disallow: /README.md\n" +
    "Disallow: /PLAN.md\n" +
    "Disallow: /PROGRESS.md\n" +
    "Disallow: /Lancer%20Badr%20AI.vbs\n" +
    "\n" +
    "Sitemap: " + SITE + "/sitemap.xml\n";
}

function write(rel, content) {
  const full = path.join(ROOT, rel);
  fs.mkdirSync(path.dirname(full), { recursive: true });
  fs.writeFileSync(full, content, "utf8");
}

write("cours/index.html", hubPage());
for (const it of ALL) write("cours/" + it.sec.id + ".html", sectionPage(it));
write("qcm.html", qcmPage());
write("flashcards.html", flashPage());
write("sitemap.xml", sitemap());
write("robots.txt", robots());
write("404.html", notFoundPage());

console.log("SEO OK: 1 hub + " + ALL.length + " sections + QCM + flashcards + sitemap + robots + 404");
console.log("Base URL: " + SITE);
console.log("Sitemap URLs: " + (ALL.length + 4));
