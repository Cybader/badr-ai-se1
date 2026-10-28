/* =========================================================
   Badr AI — Application SE1 (SPA vanilla)
   ========================================================= */
window.APP = (function () {
  "use strict";

  const KEY = "badrai.se1.progress";
  const $ = function (sel, root) { return (root || document).querySelector(sel); };
  const $$ = function (sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); };
  const reduceMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  function esc(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
  }
  function clamp(n, a, b) { return Math.max(a, Math.min(b, n)); }
  function shuffle(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      const t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  }

  /* ============================ State ============================ */
  const DEFAULT = {
    read: {}, xp: 0,
    quiz: {}, flash: { known: [] },
    exam: { best: 0, attempts: 0 },
    missions: []
  };
  function load() {
    let data = null;
    try { data = JSON.parse(localStorage.getItem(KEY) || "null"); } catch (e) { data = null; }
    const s = Object.assign({}, DEFAULT, data || {});
    s.read = (data && data.read) || {};
    s.quiz = (data && data.quiz) || {};
    s.flash = { known: (data && data.flash && data.flash.known) || [] };
    s.exam = (data && data.exam) || { best: 0, attempts: 0 };
    s.missions = (data && data.missions) || [];
    return s;
  }
  const state = load();
  let currentSection = null;
  let quizSession = null;
  let examSession = null;
  let examTimer = null;
  let flashView = { deck: "all", idx: 0, flipped: false, order: [] };
  let view = "home";

  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) { /* ignore */ }
  }

  /* Index global des sections */
  const SECTIONS = [];
  const SECMAP = {};
  COURS.chapters.forEach(function (ch) {
    ch.sections.forEach(function (sec) {
      const item = { ch: ch, sec: sec };
      SECTIONS.push(item);
      SECMAP[sec.id] = item;
    });
  });
  const TOTAL_SECTIONS = SECTIONS.length;
  const ALL_PAGES = COURS.meta.totalPages || 436;

  function readCount() {
    return SECTIONS.filter(function (it) { return state.read[it.sec.id]; }).length;
  }
  function chapterRead(ch) {
    return ch.sections.filter(function (s) { return state.read[s.id]; }).length;
  }
  function levelInfo() {
    const lvl = Math.floor(state.xp / 100) + 1;
    return { level: lvl, cur: state.xp % 100, xp: state.xp };
  }
  function addXP(n, reason) {
    if (!n) return;
    state.xp += n;
    save();
    renderXP();
    if (reason) toast("+" + n + " XP · " + reason, "good");
  }
  function missionDone(id, xp) {
    if (state.missions.indexOf(id) === -1) state.missions.push(id);
    addXP(xp || 15);
    save();
    if (view === "home") renderHome();
  }
  function renderXP() {
    const li = levelInfo();
    const a = $("#xp-pill"), b = $("#level-pill");
    if (a) a.textContent = li.xp + " XP";
    if (b) b.textContent = "Niv. " + li.level;
  }

  /* ============================ UI helpers ============================ */
  let toastTimer = null;
  function toast(msg, kind) {
    const el = $("#toast");
    if (!el) return;
    el.className = "toast " + (kind || "");
    el.textContent = msg;
    void el.offsetWidth;
    el.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { el.classList.remove("show"); }, 2600);
  }

  function modal(title, body, actions) {
    const root = $("#modal-root");
    if (!root) return;
    root.innerHTML =
      '<div class="modal-back">' +
        '<div class="modal" role="dialog" aria-modal="true">' +
          "<h3>" + esc(title) + "</h3>" +
          '<p style="white-space:pre-line">' + body + "</p>" +
          '<div class="modal-actions">' +
            (actions || []).map(function (a, i) {
              return '<button class="btn ' + (a.cls || "btn-ghost") + '" data-act="' + i + '">' + esc(a.label) + "</button>";
            }).join("") +
          "</div>" +
        "</div>" +
      "</div>";
    const back = $(".modal-back", root);
    function close() { root.innerHTML = ""; document.body.classList.remove("locked"); }
    back.addEventListener("click", function (e) { if (e.target === back) close(); });
    $$("[data-act]", root).forEach(function (btn) {
      btn.addEventListener("click", function () {
        const a = (actions || [])[+btn.getAttribute("data-act")];
        close();
        if (a && a.onClick) a.onClick();
      });
    });
    document.body.classList.add("locked");
    if (window.SFX) window.SFX.play("pop");
    return close;
  }

  /* ============================ Confetti ============================ */
  const confCanvas = $("#confetti");
  let confCtx = null, confParts = [], confRAF = null;
  function resizeConfetti() {
    if (!confCanvas) return;
    confCanvas.width = window.innerWidth * (window.devicePixelRatio || 1);
    confCanvas.height = window.innerHeight * (window.devicePixelRatio || 1);
    confCtx = confCanvas.getContext("2d");
    confCtx.setTransform(window.devicePixelRatio || 1, 0, 0, window.devicePixelRatio || 1, 0, 0);
  }
  function confetti(n) {
    if (!confCtx || reduceMotion) return;
    const colors = ["#0f5c52", "#a9472f", "#c79a3b", "#2f7d5a", "#9a6a18"];
    for (let i = 0; i < (n || 60); i++) {
      confParts.push({
        x: window.innerWidth / 2 + (Math.random() - 0.5) * 220,
        y: window.innerHeight * 0.35 + (Math.random() - 0.5) * 80,
        vx: (Math.random() - 0.5) * 9,
        vy: -Math.random() * 9 - 2,
        g: 0.22 + Math.random() * 0.12,
        s: 4 + Math.random() * 6,
        rot: Math.random() * Math.PI,
        vr: (Math.random() - 0.5) * 0.3,
        c: colors[i % colors.length],
        life: 1
      });
    }
    if (!confRAF) confRAF = requestAnimationFrame(tickConfetti);
  }
  function tickConfetti() {
    confCtx.clearRect(0, 0, window.innerWidth, window.innerHeight);
    confParts.forEach(function (p) {
      p.vy += p.g; p.x += p.vx; p.y += p.vy; p.rot += p.vr; p.life -= 0.012;
      confCtx.save();
      confCtx.globalAlpha = Math.max(0, p.life);
      confCtx.translate(p.x, p.y);
      confCtx.rotate(p.rot);
      confCtx.fillStyle = p.c;
      confCtx.fillRect(-p.s / 2, -p.s / 2, p.s, p.s * 0.6);
      confCtx.restore();
    });
    confParts = confParts.filter(function (p) { return p.life > 0 && p.y < window.innerHeight + 60; });
    if (confParts.length) confRAF = requestAnimationFrame(tickConfetti);
    else { confCtx.clearRect(0, 0, window.innerWidth, window.innerHeight); confRAF = null; }
  }

  /* ============================ Particules ============================ */
  function initParticles() {
    const canvas = $("#particles");
    if (!canvas || reduceMotion) return;
    const ctx = canvas.getContext("2d");
    let w = 0, h = 0, dots = [];
    function resize() {
      w = canvas.width = window.innerWidth * (window.devicePixelRatio || 1);
      h = canvas.height = window.innerHeight * (window.devicePixelRatio || 1);
      canvas.style.width = window.innerWidth + "px";
      canvas.style.height = window.innerHeight + "px";
      const count = Math.min(70, Math.floor(window.innerWidth / 22));
      dots = [];
      for (let i = 0; i < count; i++) {
        dots.push({
          x: Math.random() * w, y: Math.random() * h,
          vx: (Math.random() - 0.5) * 0.25 * (window.devicePixelRatio || 1),
          vy: (Math.random() - 0.5) * 0.25 * (window.devicePixelRatio || 1),
          r: (Math.random() * 1.4 + 0.4) * (window.devicePixelRatio || 1)
        });
      }
    }
    resize();
    window.addEventListener("resize", resize);
    function tick() {
      ctx.clearRect(0, 0, w, h);
      dots.forEach(function (d) {
        d.x += d.vx; d.y += d.vy;
        if (d.x < 0 || d.x > w) d.vx *= -1;
        if (d.y < 0 || d.y > h) d.vy *= -1;
        ctx.beginPath();
        ctx.arc(d.x, d.y, d.r, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(15,92,82,.28)";
        ctx.fill();
      });
      if (!document.hidden) requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  }

  /* ============================ Effects (ripple / tilt / glow) ============================ */
  function initEffects() {
    if (window.matchMedia && window.matchMedia("(pointer:fine)").matches) {
      document.body.classList.add("pointer-fine");
      const glow = $("#cursor-glow");
      if (glow) {
        window.addEventListener("mousemove", function (e) {
          glow.style.left = e.clientX + "px";
          glow.style.top = e.clientY + "px";
        }, { passive: true });
      }
    }

    document.addEventListener("click", function (e) {
      const btn = e.target.closest(".btn, .nav-btn, .choice, .quiz-cat, .deck-chip, .chapter-btn, .icon-btn, .mission-num");
      if (!btn) return;
      const r = btn.getBoundingClientRect();
      const span = document.createElement("span");
      const size = Math.max(r.width, r.height);
      span.className = "ripple";
      span.style.width = span.style.height = size + "px";
      span.style.left = (e.clientX - r.left - size / 2) + "px";
      span.style.top = (e.clientY - r.top - size / 2) + "px";
      if (getComputedStyle(btn).position === "static") btn.style.position = "relative";
      btn.appendChild(span);
      setTimeout(function () { span.remove(); }, 650);
      if (window.SFX) window.SFX.play("click");
    });

    document.addEventListener("mousemove", function (e) {
      const card = e.target.closest(".card");
      if (!card || reduceMotion) return;
      const r = card.getBoundingClientRect();
      card.style.setProperty("--mx", ((e.clientX - r.left) / r.width * 100) + "%");
      card.style.setProperty("--my", ((e.clientY - r.top) / r.height * 100) + "%");
      const rx = ((e.clientY - r.top) / r.height - 0.5) * -3;
      const ry = ((e.clientX - r.left) / r.width - 0.5) * 3;
      card.style.transform = "perspective(900px) rotateX(" + rx + "deg) rotateY(" + ry + "deg) translateY(-2px)";
    });
    document.addEventListener("mouseleave", function (e) {
      const card = e.target.closest && e.target.closest(".card");
      if (card) card.style.transform = "";
    }, true);
  }

  /* ============================ Sound ============================ */
  function syncSound() {
    if (!window.SFX) return;
    const on = !SFX.muted;
    document.documentElement.classList.toggle("sound-on", on);
    document.documentElement.classList.toggle("sound-off", !on);
    $$("#sound-toggle, #sound-toggle-top").forEach(function (b) {
      b.setAttribute("title", on ? "Couper le son" : "Activer le son");
      b.setAttribute("aria-pressed", on ? "true" : "false");
    });
  }
  function initSound() {
    syncSound();
    $$("#sound-toggle, #sound-toggle-top").forEach(function (b) {
      b.addEventListener("click", function () {
        if (!window.SFX) return;
        SFX.toggle();
        syncSound();
        toast(SFX.muted ? "Son coupé" : "Son activé", "good");
      });
    });
  }

  /* ============================ Router ============================ */
  const TITLES = {
    home: ["Badr AI", "Accueil"],
    cours: ["Programme · 436 pages", "Cours"],
    terminal: ["Unix · 16 missions", "Terminal"],
    quiz: ["QCM · 120 questions", "Quiz"],
    flash: ["Révision · 90 cartes", "Flashcards"],
    exam: ["20 questions · 30 min", "Examen"],
    outils: ["chmod · boot · arborescence", "Outils"]
  };
  function parseHash() {
    const raw = (location.hash || "").replace(/^#/, "").trim();
    const parts = raw.split("/");
    const name = parts[0];
    if (!TITLES[name]) return { view: "home", sec: null };
    const sec = parts[1] && SECMAP[parts[1]] ? parts[1] : null;
    return { view: name, sec: sec };
  }

  function navigate(name) {
    if (!TITLES[name]) name = "home";
    view = name;
    $$(".view").forEach(function (v) { v.classList.toggle("active", v.id === "view-" + name); });
    $$(".nav-btn").forEach(function (b) { b.classList.toggle("active", b.getAttribute("data-view") === name); });
    const t = TITLES[name];
    const crumb = $("#crumb"), title = $("#topbar-title");
    if (crumb) crumb.textContent = t[0];
    if (title) title.textContent = t[1];
    closeSidebar();
    if (name === "home") renderHome();
    else if (name === "cours") renderCours();
    else if (name === "terminal") { if (window.TERM) TERM.mount($("#terminal-root")); }
    else if (name === "quiz") renderQuiz();
    else if (name === "flash") renderFlash();
    else if (name === "exam") renderExam();
    else if (name === "outils") renderTools();
    const hash = name === "cours" && currentSection ? "#cours/" + currentSection : "#" + name;
    try { history.replaceState(null, "", hash); } catch (e) { /* file:// */ }
    window.scrollTo({ top: 0, behavior: reduceMotion ? "auto" : "smooth" });
  }

  function openSection(id) {
    if (!SECMAP[id]) return;
    currentSection = id;
    navigate("cours");
    const side = $(".cours-side");
    if (side && window.innerWidth <= 1080) side.classList.remove("open");
    if (window.innerWidth <= 1080) {
      setTimeout(function () {
        const reader = $("#reader");
        if (reader) reader.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "start" });
      }, 80);
    }
  }

  function closeSidebar() {
    const sb = $("#sidebar"), bd = $("#sidebar-backdrop");
    if (sb) sb.classList.remove("open");
    if (bd) bd.classList.remove("show");
  }

  /* ============================ Ring helper ============================ */
  function ringSVG(pct, size, stroke, gid, label) {
    size = size || 96; stroke = stroke || 8;
    const r = (size - stroke) / 2, c = 2 * Math.PI * r;
    const off = c * (1 - clamp(pct, 0, 100) / 100);
    const cx = size / 2;
    return '<svg viewBox="0 0 ' + size + " " + size + '" width="' + size + '" height="' + size + '">' +
      "<defs><linearGradient id=\"" + gid + "\" x1=\"0\" y1=\"0\" x2=\"1\" y2=\"1\">" +
      '<stop offset="0" stop-color="#0f5c52"/><stop offset="1" stop-color="#a9472f"/></linearGradient></defs>' +
      '<circle class="ring-track" cx="' + cx + '" cy="' + cx + '" r="' + r + '" fill="none" stroke-width="' + stroke + '"/>' +
      '<circle cx="' + cx + '" cy="' + cx + '" r="' + r + '" fill="none" stroke="url(#' + gid + ')" stroke-width="' + stroke +
      '" stroke-linecap="round" stroke-dasharray="' + c.toFixed(1) + '" stroke-dashoffset="' + off.toFixed(1) + '"/>' +
      "</svg>" + (label == null ? "" : label);
  }


  /* ============================ Illustrations & lightbox ============================ */
  function lessonImages(secId) {
    return (window.LESSON_IMAGES && window.LESSON_IMAGES.images && window.LESSON_IMAGES.images[secId]) || [];
  }

  function galleryHTML(secId) {
    const imgs = lessonImages(secId);
    if (!imgs.length) return "";
    return '<section class="lesson-gallery" aria-labelledby="lg-title">' +
      '<div class="lg-head">' +
        '<h3 id="lg-title">🖼️ Illustrations de la leçon</h3>' +
        '<span class="lg-count">' + imgs.length + (imgs.length > 1 ? " planches" : " planche") +
        " · cliquez pour agrandir</span>" +
      "</div>" +
      '<div class="lg-grid">' + imgs.map(function (im, i) {
        return '<figure class="lg-item">' +
          '<button class="lg-thumb" type="button" data-imgi="' + i + '" aria-label="Agrandir : ' + esc(im.title) + '">' +
            '<img src="' + esc(im.thumb) + '" alt="' + esc(im.title) + '" loading="lazy" decoding="async" width="360" height="' +
              Math.round(360 * im.h / im.w) + '">' +
            '<span class="lg-zoom" aria-hidden="true">⤢</span>' +
          "</button>" +
          "<figcaption>" + esc(im.title) + "</figcaption>" +
          "</figure>";
      }).join("") + "</div></section>";
  }

  let lb = null, lbState = null;

  function buildLightbox() {
    if (lb) return lb;
    lb = document.createElement("div");
    lb.className = "lightbox";
    lb.id = "lightbox";
    lb.setAttribute("role", "dialog");
    lb.setAttribute("aria-modal", "true");
    lb.setAttribute("aria-label", "Illustration agrandie");
    lb.hidden = true;
    lb.innerHTML =
      '<button class="lb-close" type="button" aria-label="Fermer">✕</button>' +
      '<button class="lb-nav lb-prev" type="button" aria-label="Illustration précédente">‹</button>' +
      '<figure class="lb-figure">' +
        '<img id="lb-img" alt="">' +
        '<figcaption id="lb-cap"></figcaption>' +
      "</figure>" +
      '<button class="lb-nav lb-next" type="button" aria-label="Illustration suivante">›</button>';
    document.body.appendChild(lb);
    lb.addEventListener("click", function (e) {
      if (e.target === lb || e.target.closest(".lb-close")) closeLightbox();
      else if (e.target.closest(".lb-prev")) stepLightbox(-1);
      else if (e.target.closest(".lb-next")) stepLightbox(1);
    });
    document.addEventListener("keydown", function (e) {
      if (!lbState) return;
      if (e.key === "Escape") { e.preventDefault(); closeLightbox(); }
      else if (e.key === "ArrowLeft") { e.preventDefault(); stepLightbox(-1); }
      else if (e.key === "ArrowRight") { e.preventDefault(); stepLightbox(1); }
    });
    return lb;
  }

  function paintLightbox() {
    if (!lbState) return;
    const im = lbState.imgs[lbState.i];
    const img = $("#lb-img");
    const cap = $("#lb-cap");
    if (img) { img.src = im.src; img.alt = im.title; }
    if (cap) {
      cap.textContent = im.title + " · " + (lbState.i + 1) + "/" + lbState.imgs.length;
    }
    const many = lbState.imgs.length > 1;
    const prev = $(".lb-prev", lb), next = $(".lb-next", lb);
    if (prev) prev.style.display = many ? "" : "none";
    if (next) next.style.display = many ? "" : "none";
  }

  function openLightbox(secId, index) {
    const imgs = lessonImages(secId);
    if (!imgs.length) return;
    buildLightbox();
    lbState = { imgs: imgs, i: Math.max(0, Math.min(imgs.length - 1, index || 0)) };
    paintLightbox();
    lb.hidden = false;
    document.body.classList.add("locked");
    if (window.SFX) window.SFX.play("click");
  }

  function stepLightbox(dir) {
    if (!lbState) return;
    lbState.i = (lbState.i + dir + lbState.imgs.length) % lbState.imgs.length;
    paintLightbox();
  }

  function closeLightbox() {
    if (!lb) return;
    lb.hidden = true;
    lbState = null;
    document.body.classList.remove("locked");
  }

  /* ============================ Home ============================ */
  const TIPS = [
    "En examen, vérifiez toujours l'ordre u → g → o avant de convertir un chmod octal.",
    "grep cherche dans le contenu ; find cherche par nom ou par propriétés.",
    "Un système multi-utilisateurs est forcément multi-tâches — l'inverse est faux.",
    "Dans un script, $0 = nom du script, $# = nombre d'arguments, $? = code retour.",
    "« $@ » préserve les limites des arguments ; « $* » les fusionne avec IFS.",
    "rm -rf / est refusé dans la démo… mais sur une vraie machine, il n'y a pas de retour.",
    "chmod 755 = rwxr-xr-x. chmod 644 = rw-r--r--. Apprenez ces deux modèles par cœur."
  ];

  function renderHome() {
    const host = $("#view-home");
    if (!host) return;
    const done = readCount();
    const pct = Math.round(done / TOTAL_SECTIONS * 100);
    const li = levelInfo();
    const quizBests = Object.keys(state.quiz).map(function (k) { return state.quiz[k]; });
    const bestQuiz = quizBests.length ? Math.max.apply(null, quizBests) : null;
    const known = state.flash.known.filter(function (id) {
      return FLASH.cards.some(function (c) { return c.id === id; });
    }).length;
    const tip = TIPS[Math.floor(Math.random() * TIPS.length)];
    let nextSec = SECTIONS.find(function (it) { return !state.read[it.sec.id]; }) || SECTIONS[0];

    const chaptersHtml = COURS.chapters.map(function (ch) {
      const rd = chapterRead(ch);
      const p = Math.round(rd / ch.sections.length * 100);
      return '<article class="card chapter-card">' +
        '<div class="chapter-top"><div class="chapter-num">' + String(ch.num).padStart(2, "0") + "</div>" +
        '<span class="badge badge-violet">' + ch.sections.length + " sections</span></div>" +
        "<div><h3>" + esc(ch.title) + '</h3><div class="ar">' + esc(ch.ar) + "</div></div>" +
        '<div class="chapter-meta"><span>' + ch.sections.reduce(function (a, s) { return a + s.pageCount; }, 0) + " pages</span><span>" + rd + "/" + ch.sections.length + " lues</span></div>" +
        '<div class="progress"><i style="width:' + p + '%"></i></div>' +
        '<button class="btn btn-sm btn-soft" data-ch="' + ch.id + '">Ouvrir le chapitre →</button>' +
        "</article>";
    }).join("");

    host.innerHTML =
      '<section class="hero">' +
        '<span class="hero-badge">✦ Badr AI · Système d\'Exploitation 1</span>' +
        "<h1>Comprendre en arabe.<br>Réussir en français.</h1>" +
        '<p class="hero-ar">افهم بالعربية · راجع بالفرنسية · استعد للامتحان بثقة</p>' +
        '<p class="hero-desc">Le cours complet (436 pages), 120 QCM corrigés, 90 flashcards, un terminal Unix interactif et un examen chronométré. Tout est hors-ligne, dans un seul espace pensé pour la réussite.</p>' +
        '<div class="hero-cta">' +
          '<button class="btn btn-primary btn-lg" id="hero-continue">▶ Reprendre le cours</button>' +
          '<button class="btn btn-lg" data-go="terminal">⌨ Terminal</button>' +
          '<button class="btn btn-lg" data-go="exam">🎓 Examen blanc</button>' +
        "</div>" +
        '<div class="hero-strip">' +
          '<div class="hero-stat"><b>' + ALL_PAGES + "</b><span>PAGES DE COURS</span></div>" +
          '<div class="hero-stat"><b>' + TOTAL_SECTIONS + "</b><span>SECTIONS</span></div>" +
          '<div class="hero-stat"><b>' + QUIZ.questions.length + "</b><span>QUESTIONS QCM</span></div>" +
          '<div class="hero-stat"><b>16</b><span>MISSIONS UNIX</span></div>' +
        "</div>" +
        '<div class="hero-glow"><div class="hero-ring">' + ringSVG(pct, 96, 8, "heroGrad") +
          "<b>" + pct + "%</b><span>COURS</span></div>" +
          '<div style="font-size:.7rem;color:var(--muted-2);max-width:110px;line-height:1.5">' + done + " / " + TOTAL_SECTIONS + " sections lues<br>Niveau " + li.level + " · " + li.xp + " XP</div>" +
        "</div>" +
      "</section>" +

      '<div class="section-head"><div><h2>Votre progression</h2><p>Chaque section lue vous rapproche de l\'examen.</p></div>' +
        '<span class="chip chip-soft">' + done + "/" + TOTAL_SECTIONS + " sections</span></div>" +

      '<div class="grid-4" style="margin-bottom:16px">' +
        '<div class="card stat-card"><div class="stat-ico">📖</div><div><div class="stat-value">' + done + "/" + TOTAL_SECTIONS + '</div><div class="stat-label">Sections lues</div></div></div>' +
        '<div class="card stat-card"><div class="stat-ico">🎯</div><div><div class="stat-value">' + (bestQuiz == null ? "—" : bestQuiz + "%") + '</div><div class="stat-label">Meilleur quiz</div></div></div>' +
        '<div class="card stat-card"><div class="stat-ico">⌨️</div><div><div class="stat-value">' + state.missions.length + "/16" + '</div><div class="stat-label">Missions Unix</div></div></div>' +
        '<div class="card stat-card"><div class="stat-ico">🃏</div><div><div class="stat-value">' + known + "/" + FLASH.cards.length + '</div><div class="stat-label">Cartes maîtrisées</div></div></div>' +
      "</div>" +

      '<div class="grid-3">' + chaptersHtml + "</div>" +

      '<div class="section-head" style="margin-top:26px"><div><h2>Continuer</h2><p>Reprenez là où vous vous êtes arrêté.</p></div></div>' +
      '<div class="grid-2">' +
        '<article class="card" style="display:flex;flex-direction:column;gap:10px">' +
          '<div class="card-head"><div class="card-ico">▶</div><div><h3 style="margin:0">Prochaine section</h3><p class="small muted">' + esc(nextSec.ch.title) + "</p></div></div>" +
          "<b>" + esc(nextSec.sec.fr) + "</b>" +
          '<div class="ar" style="color:var(--muted);font-size:.8rem">' + esc(nextSec.sec.ar) + "</div>" +
          '<button class="btn btn-primary btn-sm" data-open="' + nextSec.sec.id + '" style="align-self:flex-start;margin-top:6px">Lire maintenant →</button>' +
        "</article>" +
        '<article class="card" style="display:flex;flex-direction:column;gap:10px">' +
          '<div class="card-head"><div class="card-ico">🎓</div><div><h3 style="margin:0">Examen blanc</h3><p class="small muted">20 questions · 30 minutes · note /20</p></div></div>' +
          '<p>Conditions réelles : pas de correction immédiate, chronomètre, grille de navigation. Le meilleur score est sauvegardé.</p>' +
          '<div style="display:flex;gap:8px;margin-top:auto"><button class="btn btn-primary btn-sm" data-go="exam">Commencer</button><button class="btn btn-sm" data-go="quiz">Quiz rapide</button></div>' +
        "</article>" +
      "</div>" +

      '<div class="tip-line" style="margin-top:18px"><span>💡</span><span>' + esc(tip) + "</span></div>";

    const cont = $("#hero-continue");
    if (cont) cont.addEventListener("click", function () { openSection(nextSec.sec.id); });
    $$("[data-go]", host).forEach(function (b) {
      b.addEventListener("click", function () { navigate(b.getAttribute("data-go")); });
    });
    $$("[data-ch]", host).forEach(function (b) {
      b.addEventListener("click", function () {
        const ch = COURS.chapters.find(function (c) { return c.id === b.getAttribute("data-ch"); });
        if (ch) openSection(ch.sections[0].id);
      });
    });
    $$("[data-open]", host).forEach(function (b) {
      b.addEventListener("click", function () { openSection(b.getAttribute("data-open")); });
    });
  }

  /* ============================ Cours ============================ */
  function norm(s) {
    return String(s || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  }

  function renderChapterList() {
    const list = $("#chapter-list");
    if (!list) return;
    list.innerHTML = COURS.chapters.map(function (ch) {
      const rd = chapterRead(ch);
      const isOpen = currentSection && SECMAP[currentSection] ? SECMAP[currentSection].ch.id === ch.id : ch.num === 1;
      return '<div class="chapter-group' + (isOpen ? " open" : "") + '" data-group="' + ch.id + '">' +
        '<button class="chapter-btn" data-toggle="' + ch.id + '" type="button">' +
          '<span class="cnum">' + ch.num + "</span>" +
          '<span class="ctxt"><b>' + esc(ch.title) + "</b><small>" + esc(ch.ar) + "</small></span>" +
          '<span class="cprog">' + rd + "/" + ch.sections.length + "</span>" +
        "</button>" +
        '<div class="sections-list">' +
          ch.sections.map(function (s) {
            return '<button class="section-btn' + (state.read[s.id] ? " done" : "") + (s.id === currentSection ? " active" : "") +
              '" data-sec="' + s.id + '" type="button">' +
              '<span class="sdot"></span>' +
              '<span class="stxt">' + esc(s.fr) + "<em>" + esc(s.ar) + "</em></span>" +
              "</button>";
          }).join("") +
        "</div></div>";
    }).join("");

    $$(".chapter-btn", list).forEach(function (btn) {
      btn.addEventListener("click", function () {
        const g = btn.closest(".chapter-group");
        if (g) g.classList.toggle("open");
      });
    });
    $$(".section-btn", list).forEach(function (btn) {
      btn.addEventListener("click", function () {
        openSection(btn.getAttribute("data-sec"));
      });
    });
  }

  function renderCours() {
    renderChapterList();
    const reader = $("#reader");
    if (reader && currentSection && SECMAP[currentSection]) {
      renderSection(currentSection, true);
    } else if (reader && !reader.querySelector(".reader-head")) {
      reader.innerHTML =
        '<div class="empty-state"><div class="empty-ico">📖</div><h3>Choisissez une section</h3>' +
        "<p>Le cours complet (" + ALL_PAGES + " pages) est organisé en " + COURS.chapters.length +
        " chapitres et " + TOTAL_SECTIONS + " sections. Chaque section contient une explication en arabe et ses pages originales.</p></div>";
    }
    bindSearch();
  }

  function bindSearch() {
    const input = $("#course-search");
    const box = $("#course-search-results");
    if (!input || !box || input.dataset.bound) return;
    input.dataset.bound = "1";
    function hide() { box.hidden = true; box.innerHTML = ""; }
    input.addEventListener("input", function () {
      const q = norm(input.value.trim());
      if (q.length < 2) { hide(); return; }
      const hits = [];
      SECTIONS.forEach(function (it) {
        if (hits.length >= 12) return;
        const s = it.sec;
        if (norm(s.fr).indexOf(q) > -1 || norm(s.ar).indexOf(q) > -1 || norm(s.arText).indexOf(q) > -1) {
          hits.push({ it: it, why: "Section" });
          return;
        }
        const term = (s.terms || []).find(function (t) {
          return norm(t.fr).indexOf(q) > -1 || norm(t.ar).indexOf(q) > -1;
        });
        if (term) hits.push({ it: it, why: "Terme : " + term.fr + " — " + term.ar });
      });
      if (!hits.length) {
        box.innerHTML = '<div class="search-item"><b>Aucun résultat</b><span>Essayez « chmod », « grep » ou « boucle ».</span></div>';
      } else {
        box.innerHTML = hits.map(function (h) {
          return '<button class="search-item" type="button" data-sec="' + h.it.sec.id + '">' +
            "<b>" + esc(h.it.sec.fr) + "</b>" +
            "<span>Ch. " + h.it.ch.num + " · " + esc(h.why) + "</span></button>";
        }).join("");
      }
      box.hidden = false;
      $$(".search-item[data-sec]", box).forEach(function (b) {
        b.addEventListener("click", function () {
          input.value = "";
          hide();
          openSection(b.getAttribute("data-sec"));
        });
      });
    });
    input.addEventListener("keydown", function (e) {
      if (e.key === "Escape") { input.value = ""; hide(); input.blur(); }
    });
    document.addEventListener("click", function (e) {
      if (!e.target.closest(".cours-side-head")) hide();
    });
  }

  function pageBlocksHTML(pg) {
    if (!pg.blocks || !pg.blocks.length) {
      return '<p class="page-empty">Diapositive sans texte — titre visuel du support original.</p>';
    }
    return pg.blocks.map(function (b) {
      if (b.k === "h") return '<h4 class="page-h">' + esc(b.v) + "</h4>";
      if (b.k === "c") return '<pre class="page-code">' + esc(b.v) + "</pre>";
      if (b.k === "b") return '<p class="page-bullet">' + esc(b.v) + "</p>";
      return '<p class="page-text">' + esc(b.v) + "</p>";
    }).join("");
  }

  function renderSection(id, keepScroll) {
    const item = SECMAP[id];
    const reader = $("#reader");
    if (!item || !reader) return;
    currentSection = id;
    const ch = item.ch, sec = item.sec;
    const idx = SECTIONS.findIndex(function (s) { return s.sec.id === id; });
    const prev = SECTIONS[idx - 1], next = SECTIONS[idx + 1];
    const isRead = !!state.read[id];
    const firstPage = sec.pages.length ? sec.pages[0].n : 0;
    const lastPage = sec.pages.length ? sec.pages[sec.pages.length - 1].n : 0;
    const pagesHtml = sec.pages.map(function (pg) {
      return '<article class="page-card">' +
        '<span class="page-chip">PAGE ' + pg.n + "</span>" +
        pageBlocksHTML(pg) +
        "</article>";
    }).join("");
    const gallery = galleryHTML(id);

    reader.innerHTML =
      '<div class="reader-head">' +
        '<div class="rh-main">' +
          '<div class="crumbline">Chapitre ' + ch.num + " · pages " + firstPage + "–" + lastPage + " · " + sec.pageCount + " pages</div>" +
          "<h2>" + esc(sec.fr) + "</h2>" +
          '<div class="sec-ar ar">' + esc(sec.ar) + "</div>" +
        "</div>" +
        '<div class="rh-actions">' +
          '<button class="btn btn-sm btn-ghost" id="toggle-ar" type="button">📘 Masquer l\'arabe</button>' +
          '<button class="btn btn-sm ' + (isRead ? "btn-soft" : "btn-primary") + '" id="mark-read" type="button">' +
            (isRead ? "✓ Section lue" : "Marquer comme lu") + "</button>" +
        "</div>" +
      "</div>" +
      '<div class="reader-body">' +
        '<div class="ar-panel open" id="ar-panel">' +
          '<h3>📘 الشرح بالعربية</h3>' +
          '<p class="ar">' + esc(sec.arText) + "</p>" +
          (sec.terms && sec.terms.length ? '<div class="terms">' + sec.terms.map(function (t) {
            return '<span class="term"><b>' + esc(t.fr) + "</b><span>" + esc(t.ar) + "</span></span>";
          }).join("") + "</div>" : "") +
        "</div>" +
        gallery +
        pagesHtml +
      "</div>" +
      '<div class="pager">' +
        (prev ? '<button class="btn btn-sm" id="prev-sec" type="button">← ' + esc(prev.sec.fr) + "</button>" : "<span></span>") +
        (next ? '<button class="btn btn-sm" id="next-sec" type="button">' + esc(next.sec.fr) + " →</button>" : "<span></span>") +
      "</div>";

    const toggle = $("#toggle-ar");
    if (toggle) toggle.addEventListener("click", function () {
      const p = $("#ar-panel");
      if (!p) return;
      p.classList.toggle("open");
      toggle.textContent = p.classList.contains("open") ? "📘 Masquer l'arabe" : "📘 الشرح بالعربية";
    });
    const mark = $("#mark-read");
    if (mark) mark.addEventListener("click", function () {
      if (!state.read[id]) {
        state.read[id] = true;
        addXP(10, "Section lue");
        save();
        confetti(40);
        if (window.SFX) window.SFX.play("success");
      }
      mark.textContent = "✓ Section lue";
      mark.className = "btn btn-sm btn-soft";
      const sb = $('.section-btn[data-sec="' + id + '"]');
      if (sb) sb.classList.add("done");
      const grp = $('.chapter-group[data-group="' + ch.id + '"]');
      if (grp) {
        const prog = $(".cprog", grp);
        if (prog) prog.textContent = chapterRead(ch) + "/" + ch.sections.length;
      }
      if (view === "home") renderHome();
    });
    $$(".lg-thumb", reader).forEach(function (b) {
      b.addEventListener("click", function () {
        openLightbox(id, parseInt(b.getAttribute("data-imgi"), 10) || 0);
      });
    });
    const prevBtn = $("#prev-sec");
    if (prevBtn) prevBtn.addEventListener("click", function () { openSection(prev.sec.id); window.scrollTo({ top: 0 }); });
    const nextBtn = $("#next-sec");
    if (nextBtn) nextBtn.addEventListener("click", function () { openSection(next.sec.id); window.scrollTo({ top: 0 }); });

    renderChapterList();
    if (!keepScroll) window.scrollTo({ top: 0 });
  }

  /* ============================ Quiz ============================ */
  const CAT_LABEL = { ch1: "Chapitre 1 · Introduction", ch2: "Chapitre 2 · Commandes Unix", ch3: "Chapitre 3 · Programmation Shell", all: "Tout le cours" };

  function prepQuestion(q) {
    const order = shuffle(q.choices.map(function (_, i) { return i; }));
    return {
      id: q.id,
      cat: q.cat,
      text: q.q,
      choices: order.map(function (i) { return q.choices[i]; }),
      a: order.indexOf(q.a),
      ar: q.ar
    };
  }

  function quizPool(scope) {
    return scope === "all" ? QUIZ.questions : QUIZ.questions.filter(function (q) { return q.cat === scope; });
  }

  function renderQuiz() {
    const host = $("#quiz-root");
    if (!host) return;
    if (quizSession) { renderQuizQuestion(); return; }
    const cards = COURS.chapters.map(function (ch) {
      const scope = ch.id;
      const pool = quizPool(scope);
      const best = state.quiz[scope];
      return '<button class="quiz-cat" type="button" data-scope="' + scope + '">' +
        '<span class="qc-ico">' + (ch.num === 1 ? "🧠" : ch.num === 2 ? "⌨️" : "📜") + "</span>" +
        "<b>" + esc(ch.title) + "</b>" +
        "<span>" + pool.length + " questions disponibles · 10 tirées au hasard</span>" +
        "<small>" + (best == null ? "Pas encore tenté" : "Meilleur score : " + best + "%") + "</small>" +
        "</button>";
    }).join("");

    host.innerHTML =
      '<div class="quiz-setup">' +
        '<div class="section-head"><div><h2>Quiz — vérifiez vos acquis</h2>' +
          "<p>Choisissez un chapitre. Chaque réponse est corrigée immédiatement avec une explication en arabe.</p></div>" +
          '<span class="chip chip-soft">' + QUIZ.questions.length + " QCM</span></div>" +
        '<div class="quiz-cat-grid">' + cards +
          '<button class="quiz-cat" type="button" data-scope="all">' +
            '<span class="qc-ico">🎲</span><b>Tout le cours</b>' +
            "<span>20 questions mélangées sur les 3 chapitres</span>" +
            "<small>" + (state.quiz.all == null ? "Mode examen rapide" : "Meilleur score : " + state.quiz.all + "%") + "</small>" +
          "</button>" +
        "</div>" +
        '<div class="tip-line" style="margin-top:18px"><span>💡</span><span>Après chaque réponse, l\'explication arabe vous explique le piège — lisez-la même si vous avez juste.</span></div>' +
      "</div>";

    $$("[data-scope]", host).forEach(function (b) {
      b.addEventListener("click", function () { startQuiz(b.getAttribute("data-scope")); });
    });
  }

  function startQuiz(scope) {
    const pool = shuffle(quizPool(scope)).slice(0, scope === "all" ? 20 : 10).map(prepQuestion);
    quizSession = { scope: scope, items: pool, idx: 0, answers: pool.map(function () { return null; }), correct: 0 };
    renderQuizQuestion();
    window.scrollTo({ top: 0 });
  }

  function renderQuizQuestion() {
    const host = $("#quiz-root");
    const s = quizSession;
    if (!host || !s) return;
    const q = s.items[s.idx];
    const answered = s.answers[s.idx] != null;
    const pct = Math.round(s.idx / s.items.length * 100);
    const letters = ["A", "B", "C", "D", "E", "F"];
    host.innerHTML =
      '<div class="quiz-session">' +
        '<div class="quiz-top">' +
          '<button class="btn btn-sm btn-ghost" id="quit-quiz" type="button">← Quitter</button>' +
          '<span class="q-count">Question ' + (s.idx + 1) + " / " + s.items.length + "</span>" +
          '<div class="q-progress"><div class="progress"><i style="width:' + pct + '%"></i></div></div>' +
          '<span class="badge badge-violet">' + esc(CAT_LABEL[q.cat] || "") + "</span>" +
        "</div>" +
        '<div class="card quiz-card">' +
          '<div class="q-num">Question ' + (s.idx + 1) + "</div>" +
          '<div class="q-text">' + esc(q.text) + "</div>" +
          '<div class="q-choices">' + q.choices.map(function (c, i) {
            return '<button class="choice" type="button" data-choice="' + i + '">' +
              '<span class="cletter">' + letters[i] + "</span><span>" + esc(c) + "</span></button>";
          }).join("") + "</div>" +
          '<div class="quiz-feedback" id="quiz-feedback"><div class="qf-title"></div><p></p></div>' +
          '<div class="quiz-nav">' +
            '<span class="small muted">Une seule réponse possible.</span>' +
            '<button class="btn btn-primary" id="next-question" type="button" disabled>' +
              (s.idx === s.items.length - 1 ? "Voir le résultat →" : "Question suivante →") + "</button>" +
          "</div>" +
        "</div>" +
      "</div>";

    $("#quit-quiz").addEventListener("click", function () {
      modal("Quitter le quiz ?", "Votre progression sur ce quiz sera perdue.", [
        { label: "Continuer le quiz", cls: "btn-ghost" },
        { label: "Quitter", cls: "btn-danger", onClick: function () { quizSession = null; renderQuiz(); } }
      ]);
    });

    $$("[data-choice]", host).forEach(function (btn) {
      btn.addEventListener("click", function () {
        if (s.answers[s.idx] != null) return;
        const pick = +btn.getAttribute("data-choice");
        s.answers[s.idx] = pick;
        const good = pick === q.a;
        if (good) s.correct++;
        $$("[data-choice]", host).forEach(function (b) {
          const i = +b.getAttribute("data-choice");
          b.classList.add("disabled");
          if (i === q.a) b.classList.add("correct");
          if (i === pick && !good) b.classList.add("wrong");
        });
        const fb = $("#quiz-feedback");
        fb.className = "quiz-feedback show " + (good ? "good" : "bad");
        $(".qf-title", fb).textContent = good ? "✓ Bonne réponse" : "✗ Réponse incorrecte";
        $("p", fb).textContent = (good ? "" : "La bonne réponse est : " + q.choices[q.a] + ". ") + q.ar;
        const next = $("#next-question");
        next.disabled = false;
        if (window.SFX) window.SFX.play(good ? "success" : "error");
        if (good) confetti(16);
      });
    });

    $("#next-question").addEventListener("click", function () {
      if (s.answers[s.idx] == null) return;
      if (s.idx === s.items.length - 1) finishQuiz();
      else { s.idx++; renderQuizQuestion(); window.scrollTo({ top: 0 }); }
    });
  }

  function finishQuiz() {
    const s = quizSession;
    if (!s) return;
    const total = s.items.length;
    const pct = Math.round(s.correct / total * 100);
    const prev = state.quiz[s.scope];
    if (prev == null || pct > prev) {
      state.quiz[s.scope] = pct;
      const gain = Math.max(5, Math.round((pct - (prev || 0)) / 4));
      addXP(gain, "Quiz amélioré");
    }
    save();
    const good = pct >= 80 ? "Excellent !" : pct >= 60 ? "Bien joué !" : pct >= 40 ? "À consolider" : "À retravailler";
    const sub = pct >= 60 ? "Vous êtes sur la bonne voie pour l'examen." : "Relisez les sections concernées puis retentez le quiz.";
    const wrong = s.items.filter(function (q, i) { return s.answers[i] != null && s.answers[i] !== q.a; });
    const host = $("#quiz-root");
    host.innerHTML =
      '<div class="quiz-result"><div class="card result-card">' +
        '<div class="result-ring">' + ringSVG(pct, 150, 11, "quizGrad") +
          "<b>" + pct + "%</b><small>" + s.correct + "/" + total + "</small></div>" +
        '<div class="result-note">' + good + "</div>" +
        '<p class="result-sub">' + esc(CAT_LABEL[s.scope]) + " · " + sub + "</p>" +
        (wrong.length ?
          '<div class="review-list">' + wrong.map(function (q) {
            return '<div class="review-item">' +
              '<div class="ri-q">' + esc(q.text) + "</div>" +
              '<div class="ri-a">✓ ' + esc(q.choices[q.a]) + "</div>" +
              '<div class="ri-ar">' + esc(q.ar) + "</div></div>";
          }).join("") + "</div>"
          : '<div class="review-list"><div class="review-item"><div class="ri-q">Aucune erreur — sans faute ! 🎉</div><div class="ri-ar">ممتاز، أتقنت هذا الجزء. جرّب فصلًا آخر أو الامتحان الكامل.</div></div></div>') +
        '<div class="result-actions">' +
          '<button class="btn btn-primary" id="retry-quiz" type="button">↻ Recommencer</button>' +
          '<button class="btn" id="other-quiz" type="button">Choisir un autre quiz</button>' +
          '<button class="btn btn-ghost" id="goto-cours" type="button">📖 Revoir le cours</button>' +
        "</div>" +
      "</div></div>";
    if (pct >= 60) { confetti(110); if (window.SFX) window.SFX.play("fanfare"); }
    $("#retry-quiz").addEventListener("click", function () { startQuiz(s.scope); });
    $("#other-quiz").addEventListener("click", function () { quizSession = null; renderQuiz(); });
    $("#goto-cours").addEventListener("click", function () { navigate("cours"); });
    if (view === "home") renderHome();
  }

  /* ============================ Flashcards ============================ */
  function deckCards(deck) {
    return deck === "all" ? FLASH.cards : FLASH.cards.filter(function (c) { return c.deck === deck; });
  }
  function buildFlashOrder() {
    flashView.order = deckCards(flashView.deck).map(function (c) { return c.id; });
    if (flashView.idx >= flashView.order.length) flashView.idx = 0;
  }
  function cardById(id) {
    return FLASH.cards.find(function (c) { return c.id === id; });
  }

  function renderFlash() {
    const host = $("#flash-root");
    if (!host) return;
    if (!flashView.order.length) buildFlashOrder();
    const order = flashView.order;
    const card = cardById(order[flashView.idx]);
    if (!card) { buildFlashOrder(); return renderFlash(); }
    const known = state.flash.known;
    const deckKnown = order.filter(function (id) { return known.indexOf(id) > -1; }).length;
    const pct = Math.round(deckKnown / order.length * 100);
    const deckName = flashView.deck === "all" ? "Tout" : (FLASH.decks.find(function (d) { return d.id === flashView.deck; }) || {}).name;
    const totalKnown = known.filter(function (id) { return cardById(id); }).length;

    host.innerHTML =
      '<div class="flash-wrap">' +
        '<div class="section-head"><div><h2>Flashcards — mémorisez vite</h2>' +
          "<p>Cliquez sur la carte pour révéler la réponse. Classez ce que vous maîtrisez.</p></div>" +
          '<span class="chip chip-soft">' + totalKnown + "/" + FLASH.cards.length + " maîtrisées</span></div>" +
        '<div class="deck-bar">' +
          '<button class="deck-chip' + (flashView.deck === "all" ? " active" : "") + '" data-deck="all">Tout · ' + FLASH.cards.length + "</button>" +
          FLASH.decks.map(function (d) {
            return '<button class="deck-chip' + (flashView.deck === d.id ? " active" : "") + '" data-deck="' + d.id + '">' +
              esc(d.name) + " · " + deckCards(d.id).length + "</button>";
          }).join("") +
          '<button class="deck-chip" id="shuffle-cards" type="button">🔀 Mélanger</button>' +
        "</div>" +
        '<div class="flash-stage"><div class="flash-card' + (flashView.flipped ? " flipped" : "") + '" id="flash-card" tabindex="0" role="button" aria-label="Retourner la carte">' +
          '<div class="flash-face front">' +
            '<span class="flash-cat">' + esc(deckName) + " · " + (flashView.idx + 1) + "/" + order.length + "</span>" +
            '<div class="flash-front-text">' + esc(card.front) + "</div>" +
            '<div class="flash-hint">' + esc(card.hint || "") + "</div>" +
            '<div class="flash-hint" style="margin-top:6px">Cliquez pour retourner ⟳</div>' +
          "</div>" +
          '<div class="flash-face back">' +
            '<span class="flash-cat">Réponse</span>' +
            '<div class="flash-back-text">' + esc(card.back) + "</div>" +
            '<div class="flash-hint">Cliquez pour revenir à la question</div>' +
          "</div>" +
        "</div>" +
        '<div class="flash-meta">Carte ' + (flashView.idx + 1) + " / " + order.length + "</div>" +
        "</div>" +
        '<div class="flash-controls">' +
          '<button class="btn" id="prev-card" type="button">← Précédente</button>' +
          '<button class="btn btn-soft" id="flip-card" type="button">⟳ Retourner</button>' +
          '<button class="btn btn-danger" id="review-card" type="button">À revoir</button>' +
          '<button class="btn btn-primary" id="known-card" type="button">Je connais ✓</button>' +
          '<button class="btn" id="next-card" type="button">Suivante →</button>' +
        "</div>" +
        '<div class="flash-stats"><span><b>' + deckKnown + "</b> / " + order.length + " maîtrisées dans ce deck</span><span>·</span><span>" + known.length + " au total</span></div>" +
        '<div class="progress flash-progress"><i style="width:' + pct + '%"></i></div>' +
      "</div>";

    function flip() {
      flashView.flipped = !flashView.flipped;
      const el = $("#flash-card");
      if (el) el.classList.toggle("flipped", flashView.flipped);
      if (window.SFX) window.SFX.play("pop");
    }
    function go(delta) {
      flashView.idx = (flashView.idx + delta + order.length) % order.length;
      flashView.flipped = false;
      renderFlash();
    }
    const fc = $("#flash-card");
    if (fc) {
      fc.addEventListener("click", flip);
      fc.addEventListener("keydown", function (e) {
        if (e.key === " " || e.key === "Enter") { e.preventDefault(); flip(); }
      });
    }
    $("#flip-card").addEventListener("click", flip);
    $("#prev-card").addEventListener("click", function () { go(-1); });
    $("#next-card").addEventListener("click", function () { go(1); });
    $("#known-card").addEventListener("click", function () {
      if (state.flash.known.indexOf(card.id) === -1) {
        state.flash.known.push(card.id);
        save();
        addXP(5, "Carte maîtrisée");
        if (window.SFX) window.SFX.play("success");
        confetti(14);
      }
      go(1);
    });
    $("#review-card").addEventListener("click", function () {
      const i = state.flash.known.indexOf(card.id);
      if (i > -1) { state.flash.known.splice(i, 1); save(); }
      go(1);
    });
    $$("[data-deck]", host).forEach(function (b) {
      b.addEventListener("click", function () {
        flashView.deck = b.getAttribute("data-deck");
        flashView.idx = 0;
        flashView.flipped = false;
        buildFlashOrder();
        renderFlash();
      });
    });
    $("#shuffle-cards").addEventListener("click", function () {
      flashView.order = shuffle(flashView.order);
      flashView.idx = 0;
      flashView.flipped = false;
      renderFlash();
      if (window.SFX) window.SFX.play("whoosh");
    });
  }

  /* ============================ Examen ============================ */
  const EXAM_COUNT = 20;
  const EXAM_MINUTES = 30;

  function examRemaining() {
    if (!examSession) return 0;
    return Math.max(0, examSession.endsAt - Date.now());
  }
  function fmtTime(ms) {
    const s = Math.ceil(ms / 1000);
    return String(Math.floor(s / 60)).padStart(2, "0") + ":" + String(s % 60).padStart(2, "0");
  }
  function tickExam() {
    const el = $("#exam-timer");
    if (!el || !examSession) return;
    const left = examRemaining();
    el.textContent = "⏱ " + fmtTime(left);
    el.classList.toggle("danger", left < 5 * 60 * 1000);
    if (left <= 0 && !examSession.submitted) {
      examSession.submitted = true;
      toast("Temps écoulé — remise automatique de la copie.", "bad");
      if (window.SFX) window.SFX.play("bell");
      submitExam(true);
    }
  }
  function startExamTimer() {
    if (examTimer) clearInterval(examTimer);
    tickExam();
    examTimer = setInterval(tickExam, 1000);
  }

  function renderExam() {
    const host = $("#exam-root");
    if (!host) return;
    if (examSession) { renderExamQuestion(); return; }
    const best = state.exam.best || 0;
    const attempts = state.exam.attempts || 0;
    const pct = Math.round(best / EXAM_COUNT * 100);
    host.innerHTML =
      '<div class="exam-wrap">' +
        '<div class="section-head"><div><h2>Examen blanc</h2>' +
          "<p>Conditions réelles : 20 questions, 30 minutes, note sur 20 et correction détaillée en arabe.</p></div>" +
          '<span class="chip chip-soft">Note /20</span></div>' +
        '<div class="exam-rules">' +
          '<div class="rule"><b>🎲 20 questions</b> Tirées au hasard sur les 3 chapitres, sans doublon.</div>' +
          '<div class="rule"><b>⏱ 30 minutes</b> Chronomètre réel, remise automatique à la fin du temps.</div>' +
          '<div class="rule"><b>📝 Note /20</b> Pas de correction immédiate — tout est corrigé à la remise.</div>' +
        "</div>" +
        '<div class="card" style="display:flex;gap:22px;align-items:center;flex-wrap:wrap;padding:26px">' +
          '<div class="ring-wrap">' + ringSVG(pct, 64, 6, "examBest") + "<b>" + best + "</b></div>" +
          '<div style="flex:1;min-width:220px">' +
            '<h3 style="margin:0 0 4px">' + (attempts ? "Meilleure note : " + best + "/20" : "Aucune tentative pour le moment") + "</h3>" +
            '<p class="small muted" style="margin:0">' + (attempts ? attempts + " tentative(s) enregistrée(s). Objectif : 14/20 ou plus." : "Mettez-vous en conditions réelles : une seule feuille, pas de notes, un chronomètre.") + "</p>" +
          "</div>" +
          '<button class="btn btn-primary btn-lg" id="start-exam" type="button">Commencer l\'examen →</button>' +
        "</div>" +
        '<div class="tip-line" style="margin-top:18px"><span>⚖️</span><span>Barème : 1 point par bonne réponse. Une question sans réponse ne rapporte rien et ne retire rien.</span></div>' +
      "</div>";
    $("#start-exam").addEventListener("click", startExam);
  }

  function startExam() {
    const items = shuffle(QUIZ.questions).slice(0, EXAM_COUNT).map(prepQuestion);
    examSession = {
      items: items,
      idx: 0,
      answers: items.map(function () { return null; }),
      endsAt: Date.now() + EXAM_MINUTES * 60 * 1000,
      submitted: false
    };
    renderExamQuestion();
    startExamTimer();
    if (window.SFX) window.SFX.play("whoosh");
    window.scrollTo({ top: 0 });
  }

  function renderExamQuestion() {
    const host = $("#exam-root");
    const s = examSession;
    if (!host || !s) return;
    const q = s.items[s.idx];
    const letters = ["A", "B", "C", "D", "E", "F"];
    const left = examRemaining();
    host.innerHTML =
      '<div class="exam-wrap">' +
        '<div class="quiz-top">' +
          '<span class="q-count">Question ' + (s.idx + 1) + " / " + s.items.length + "</span>" +
          '<span class="exam-timer' + (left < 5 * 60 * 1000 ? " danger" : "") + '" id="exam-timer">⏱ ' + fmtTime(left) + "</span>" +
          '<span class="badge badge-amber">Examen en cours</span>' +
        "</div>" +
        '<div class="exam-grid">' +
          '<div class="card quiz-card">' +
            '<div class="q-num">Question ' + (s.idx + 1) + "</div>" +
            '<div class="q-text">' + esc(q.text) + "</div>" +
            '<div class="q-choices">' + q.choices.map(function (c, i) {
              return '<button class="choice' + (s.answers[s.idx] === i ? " selected" : "") + '" type="button" data-choice="' + i + '">' +
                '<span class="cletter">' + letters[i] + "</span><span>" + esc(c) + "</span></button>";
            }).join("") + "</div>" +
            '<div class="exam-actions">' +
              '<button class="btn btn-sm" id="exam-prev" type="button"' + (s.idx === 0 ? " disabled" : "") + ">← Précédente</button>" +
              '<button class="btn btn-sm btn-soft" id="exam-next" type="button"' + (s.idx === s.items.length - 1 ? " disabled" : "") + ">Suivante →</button>" +
            "</div>" +
          "</div>" +
          '<aside class="card" style="padding:16px">' +
            '<div class="qnav">' + s.items.map(function (_, i) {
              return '<button type="button" data-jump="' + i + '" class="' + (s.answers[i] != null ? "answered " : "") + (i === s.idx ? "current" : "") + '">' + (i + 1) + "</button>";
            }).join("") + "</div>" +
            '<div class="exam-legend"><b style="color:var(--violet-2)">■</b> Répondue · <b style="color:var(--cyan)">□</b> Courante<br>Sans réponse : 0 point.</div>' +
            '<button class="btn btn-primary" id="finish-exam" type="button" style="width:100%;margin-top:12px">Remettre la copie</button>' +
            '<button class="btn btn-ghost btn-sm" id="abandon-exam" type="button" style="width:100%;margin-top:6px">Abandonner</button>' +
          "</aside>" +
        "</div>" +
      "</div>";

    $$("[data-choice]", host).forEach(function (btn) {
      btn.addEventListener("click", function () {
        if (!examSession || examSession.submitted) return;
        const i = +btn.getAttribute("data-choice");
        examSession.answers[examSession.idx] = i;
        $$("[data-choice]", host).forEach(function (b) { b.classList.toggle("selected", b === btn); });
        const nav = $('[data-jump="' + examSession.idx + '"]');
        if (nav) nav.classList.add("answered");
        if (window.SFX) window.SFX.play("click");
      });
    });
    $$("[data-jump]", host).forEach(function (btn) {
      btn.addEventListener("click", function () {
        if (!examSession) return;
        examSession.idx = +btn.getAttribute("data-jump");
        renderExamQuestion();
      });
    });
    const prev = $("#exam-prev");
    if (prev) prev.addEventListener("click", function () {
      if (examSession && examSession.idx > 0) { examSession.idx--; renderExamQuestion(); }
    });
    const next = $("#exam-next");
    if (next) next.addEventListener("click", function () {
      if (examSession && examSession.idx < examSession.items.length - 1) { examSession.idx++; renderExamQuestion(); }
    });
    $("#finish-exam").addEventListener("click", function () { askFinish(); });
    $("#abandon-exam").addEventListener("click", function () {
      modal("Abandonner l'examen ?", "La copie sera perdue et aucune note ne sera enregistrée.", [
        { label: "Continuer", cls: "btn-ghost" },
        { label: "Abandonner", cls: "btn-danger", onClick: function () {
          if (examTimer) clearInterval(examTimer);
          examTimer = null; examSession = null; renderExam();
        } }
      ]);
    });
  }

  function askFinish() {
    if (!examSession) return;
    const missing = examSession.answers.filter(function (a) { return a == null; }).length;
    modal("Remettre la copie ?",
      missing ? missing + " question(s) sans réponse. Elles seront comptées fausses (0 point)." : "Toutes les questions ont une réponse. Bonne chance !",
      [
        { label: "Continuer", cls: "btn-ghost" },
        { label: "Remettre", cls: "btn-primary", onClick: function () { submitExam(false); } }
      ]);
  }

  function submitExam(auto) {
    if (!examSession || examSession.submitted && !auto) return;
    examSession.submitted = true;
    if (examTimer) clearInterval(examTimer);
    examTimer = null;
    const s = examSession;
    const correct = s.items.reduce(function (acc, q, i) { return acc + (s.answers[i] === q.a ? 1 : 0); }, 0);
    const unanswered = s.answers.filter(function (a) { return a == null; }).length;
    const pct = Math.round(correct / s.items.length * 100);
    const prevBest = state.exam.best || 0;
    state.exam.attempts = (state.exam.attempts || 0) + 1;
    if (correct > prevBest) {
      state.exam.best = correct;
      addXP((correct - prevBest) * 3, "Examen amélioré");
    }
    save();
    const note = correct >= 16 ? "Très bien — niveau examen validé." :
      correct >= 12 ? "Bien — encore quelques pièges à sécuriser." :
      correct >= 8 ? "Passable — relisez les chapitres faibles." :
      "Insuffisant — reprenez le cours puis retentez.";
    const host = $("#exam-root");
    host.innerHTML =
      '<div class="quiz-result"><div class="card result-card">' +
        '<div class="result-ring">' + ringSVG(pct, 150, 11, "examGrad") +
          "<b>" + correct + "/20</b><small>" + pct + "%</small></div>" +
        '<div class="result-note">' + (correct >= 14 ? "🎉 Objectif atteint !" : correct >= 10 ? "Presque !" : "Il faut retravailler.") + "</div>" +
        '<p class="result-sub">' + note + (unanswered ? " · " + unanswered + " sans réponse" : "") + "</p>" +
        '<div class="review-list">' + s.items.map(function (q, i) {
          const pick = s.answers[i];
          const good = pick === q.a;
          return '<div class="review-item" style="border-color:' + (good ? "rgba(47,125,90,.35)" : "rgba(184,67,63,.35)") + '">' +
            '<div class="ri-q">' + (good ? "✓" : "✗") + " " + (i + 1) + ". " + esc(q.text) + "</div>" +
            '<div class="ri-a" style="color:' + (good ? "#1f6b4b" : "#a33f2b") + '">' +
              (pick == null ? "Sans réponse" : "Votre réponse : " + esc(q.choices[pick])) +
              (good ? "" : " · Bonne réponse : " + esc(q.choices[q.a])) + "</div>" +
            '<div class="ri-ar">' + esc(q.ar) + "</div></div>";
        }).join("") + "</div>" +
        '<div class="result-actions">' +
          '<button class="btn btn-primary" id="new-exam" type="button">↻ Nouvel examen</button>' +
          '<button class="btn" id="exam-quiz" type="button">Quiz ciblé</button>' +
          '<button class="btn btn-ghost" id="exam-cours" type="button">📖 Revoir le cours</button>' +
        "</div>" +
      "</div></div>";
    examSession = null;
    if (pct >= 70) { confetti(130); if (window.SFX) window.SFX.play("fanfare"); }
    $("#new-exam").addEventListener("click", function () { renderExam(); });
    $("#exam-quiz").addEventListener("click", function () { navigate("quiz"); });
    $("#exam-cours").addEventListener("click", function () { navigate("cours"); });
    if (view === "home") renderHome();
  }

  /* ============================ Outils ============================ */
  const PERMS = ["---", "--x", "-w-", "-wx", "r--", "r-x", "rw-", "rwx"];

  function renderTools() {
    const host = $("#outils-root");
    if (!host) return;
    const roleNames = { u: "u · Propriétaire", g: "g · Groupe", o: "o · Autres" };
    const roleDesc = { u: "المالك", g: "المجموعة", o: "الآخرون" };

    host.innerHTML =
      '<div class="section-head"><div><h2>Outils interactifs</h2>' +
        "<p>Manipulez les notions qui tombent le plus à l'examen : droits, démarrage, arborescence.</p></div>" +
        '<span class="chip chip-soft">3 outils</span></div>' +
      '<div class="tools-grid">' +

        '<section class="card tool-card">' +
          '<div class="tool-head"><div class="card-ico">🔐</div><div><h3>Calculateur chmod</h3><p>Octal ↔ rwx ↔ symbolique, en direct.</p></div></div>' +
          '<div class="chmod-grid">' +
            ["u", "g", "o"].map(function (role, idx) {
              return '<div class="perm-col"><h4>' + esc(roleNames[role]) + "</h4>" +
                ["r", "w", "x"].map(function (p, bit) {
                  const weight = [4, 2, 1][bit];
                  return '<label><input type="checkbox" data-role="' + role + '" data-bit="' + weight + '"' +
                    (idx === 0 || (role === "g" && p !== "x") || (role === "o" && p !== "x") ? "" : "") + "> " +
                    p + " — " + (p === "r" ? "lire" : p === "w" ? "écrire" : "exécuter") + " (" + weight + ")</label>";
                }).join("") +
                '<div style="font-size:.64rem;color:var(--muted-2);margin-top:4px;direction:rtl;text-align:right">' + roleDesc[role] + "</div></div>";
            }).join("") +
          "</div>" +
          '<div class="chmod-result">' +
            '<div class="octal-box"><span>Octal</span><input id="octal-input" inputmode="numeric" maxlength="3" value="755" aria-label="Valeur octale"></div>' +
            '<div class="symbolic-box" id="symbolic-out">rwxr-xr-x</div>' +
            '<label style="display:inline-flex;align-items:center;gap:7px;font-size:.74rem;color:var(--muted);margin-left:auto"><input type="checkbox" id="chmod-dir" style="accent-color:#0f5c52"> Dossier</label>' +
          "</div>" +
          '<div class="ls-preview" id="ls-preview"></div>' +
          '<div class="chmod-note">r = 4 · w = 2 · x = 1. Pour un dossier, x = droit de le traverser (entrer).<br><span class="ar" style="display:block;margin-top:6px">r قراءة، w كتابة، x تنفيذ — وللمجلد x يعني حق الدخول/العبور.</span></div>' +
        "</section>" +

        '<section class="card tool-card">' +
          '<div class="tool-head"><div class="card-ico">🚀</div><div><h3>Séquence de démarrage</h3><p>Du bouton power au prompt du shell.</p></div></div>' +
          '<div class="boot-steps" id="boot-steps"></div>' +
          '<div class="boot-panel" id="boot-panel"></div>' +
          '<div class="exam-actions"><button class="btn btn-primary btn-sm" id="boot-play" type="button">▶ Lancer la séquence</button>' +
          '<button class="btn btn-sm" id="boot-reset" type="button">Réinitialiser</button></div>' +
        "</section>" +

        '<section class="card tool-card wide">' +
          '<div class="tool-head"><div class="card-ico">🌳</div><div><h3>Arborescence Linux</h3><p>Cliquez sur un dossier pour découvrir son rôle.</p></div></div>' +
          '<div class="tree-layout">' +
            '<div class="tree" id="linux-tree"></div>' +
            '<div class="tree-detail" id="tree-detail"></div>' +
          "</div>" +
        "</section>" +

      "</div>";

    initChmod();
    initBoot();
    initTree();
  }

  /* ---------- chmod ---------- */
  function initChmod() {
    const host = $("#outils-root");
    if (!host) return;
    const checks = $$("#outils-root .perm-col input[type=checkbox]");
    const octal = $("#octal-input");
    const symbolic = $("#symbolic-out");
    const preview = $("#ls-preview");
    const dirBox = $("#chmod-dir");

    function digitsFromChecks() {
      const d = { u: 0, g: 0, o: 0 };
      checks.forEach(function (c) {
        if (c.checked && c.dataset.role) d[c.dataset.role] += +c.dataset.bit;
      });
      return [d.u, d.g, d.o];
    }
    function applyDigits(digits) {
      checks.forEach(function (c) {
        const role = c.dataset.role;
        const idx = role === "u" ? 0 : role === "g" ? 1 : 2;
        c.checked = !!(digits[idx] & +c.dataset.bit);
      });
    }
    function paint(digits) {
      const sym = digits.map(function (d) { return PERMS[d]; }).join("");
      if (symbolic) symbolic.textContent = sym;
      if (preview) {
        const type = dirBox && dirBox.checked ? "d" : "-";
        preview.innerHTML = "<b>" + type + sym + "</b> 1 etudiant etudiant " +
          (dirBox && dirBox.checked ? "4096" : "2048") + " 28 oct. 11:07 " +
          (dirBox && dirBox.checked ? "projets" : "script.sh");
      }
    }
    function fromChecks(syncOctal) {
      const digits = digitsFromChecks();
      if (syncOctal && octal) octal.value = digits.join("");
      paint(digits);
    }
    checks.forEach(function (c) {
      c.addEventListener("change", function () { fromChecks(true); if (window.SFX) window.SFX.play("click"); });
    });
    if (dirBox) dirBox.addEventListener("change", function () { fromChecks(false); });
    if (octal) {
      octal.addEventListener("input", function () {
        let v = octal.value.replace(/[^0-7]/g, "").slice(0, 3);
        octal.value = v;
        if (v.length === 3) {
          const digits = v.split("").map(Number);
          applyDigits(digits);
          paint(digits);
        }
      });
    }
    /* Valeur initiale : 755 */
    applyDigits([7, 5, 5]);
    fromChecks(true);
  }

  /* ---------- démarrage ---------- */
  const BOOT = [
    { key: "bios", ico: "🔌", title: "BIOS", sub: "ROM", fr: "Au démarrage, le BIOS (stocké dans la ROM) teste le matériel, initialise les périphériques puis cherche un périphérique de démarrage.", ar: "عند التشغيل يُنفَّذ BIOS من ROM: يفحص العتاد، يهيئ الأجهزة ويبحث عن قرص الإقلاع." },
    { key: "grub", ico: "🧭", title: "GRUB", sub: "Boot loader", fr: "GRUB est le chargeur d'amorçage : il affiche le menu (Windows / Linux), charge le noyau choisi et lui transmet les paramètres.", ar: "GRUB هو محمّل الإقلاع: يعرض قائمة الأنظمة، يحمّل النواة المختارة ويمرر لها الإعدادات." },
    { key: "noyau", ico: "⚙️", title: "Noyau", sub: "kernel", fr: "Le noyau est chargé en mémoire, initialise les pilotes et lance le premier processus (init/systemd) qui démarrera les services.", ar: "تُحمَّل النواة في الذاكرة، تهيئ التعريفات وتطلق أول عملية (init/systemd) التي تشغل الخدمات." },
    { key: "shell", ico: "⌨️", title: "Shell", sub: "bash", fr: "Le shell démarre, lit .bashrc/.profile, affiche l'invite et attend vos commandes. Le système est prêt.", ar: "يبدأ الشل، يقرأ .bashrc/.profile، يعرض الدعوة وينتظر أوامرك. النظام جاهز." }
  ];
  let bootTimers = [];
  function clearBootTimers() {
    bootTimers.forEach(clearTimeout);
    bootTimers = [];
  }
  function initBoot() {
    const steps = $("#boot-steps");
    const panel = $("#boot-panel");
    if (!steps || !panel) return;
    steps.innerHTML = BOOT.map(function (b, i) {
      return '<button class="boot-step" type="button" data-step="' + i + '">' +
        '<div class="bs-ico">' + b.ico + "</div><b>" + b.title + "</b><span>" + b.sub + "</span></button>";
    }).join("");
    function show(i) {
      $$(".boot-step", steps).forEach(function (el, k) {
        el.classList.toggle("active", k === i);
        el.classList.toggle("done", k < i);
      });
      const b = BOOT[i];
      panel.innerHTML = "<h4>" + b.ico + " " + b.title + " <span style='color:var(--muted-2);font-size:.7rem'>(" + b.sub + ")</span></h4>" +
        '<div class="fr">' + esc(b.fr) + '</div><div class="ar">' + esc(b.ar) + "</div>";
    }
    $$(".boot-step", steps).forEach(function (el) {
      el.addEventListener("click", function () {
        clearBootTimers();
        show(+el.getAttribute("data-step"));
      });
    });
    const play = $("#boot-play");
    if (play) play.addEventListener("click", function () {
      clearBootTimers();
      show(0);
      if (window.SFX) window.SFX.play("whoosh");
      BOOT.forEach(function (_, i) {
        if (!i) return;
        bootTimers.push(setTimeout(function () {
          if (!$("#boot-panel")) return;
          show(i);
          if (window.SFX) window.SFX.play("pop");
        }, i * 1300));
      });
    });
    const reset = $("#boot-reset");
    if (reset) reset.addEventListener("click", function () {
      clearBootTimers();
      show(0);
    });
    show(0);
  }

  /* ---------- arborescence ---------- */
  const TREE = [
    { path: "/", fr: "Racine unique de l'arborescence : tout part de /. Il n'y a pas de lecteur C: sous Unix.", ar: "جذر واحد للشجرة: كل شيء يبدأ من /. لا وجود لأقراص C: في يونكس." },
    { path: "/bin", fr: "Commandes essentielles disponibles pour tous : ls, cp, mv, cat, echo…", ar: "أوامر أساسية متاحة للجميع مثل ls وcp وcat." },
    { path: "/etc", fr: "Fichiers de configuration du système : passwd, group, shadow, hosts…", ar: "ملفات إعداد النظام: passwd وgroup وshadow وغيرها." },
    { path: "/home", fr: "Répertoires personnels des utilisateurs.", ar: "المجلدات الشخصية للمستخدمين." },
    { path: "/home/etudiant", fr: "Votre répertoire personnel (~). Vous y avez tous les droits d'écriture.", ar: "مجلدك الشخصي (~). تملك فيه كل حقوق الكتابة." },
    { path: "/root", fr: "Répertoire personnel du super-utilisateur root (accès restreint).", ar: "المجلد الشخصي للمستخدم الخارق root (وصول محدود)." },
    { path: "/tmp", fr: "Fichiers temporaires, souvent en mode 1777 : chacun écrit, mais ne supprime que ses fichiers.", ar: "ملفات مؤقتة بنمط 1777 غالبًا: الجميع يكتب لكن لا يحذف إلا ملفاته." },
    { path: "/usr", fr: "Programmes, bibliothèques et documentation (usr = Unix System Resources).", ar: "البرامج والمكتبات والوثائق (usr = موارد نظام يونكس)." },
    { path: "/usr/bin", fr: "Commandes utilisateur : vim, tar, gcc, python…", ar: "أوامر المستخدم مثل vim وtar وgcc." },
    { path: "/var", fr: "Données variables : files d'attente, bases, journaux…", ar: "بيانات متغيرة: الطوابير وقواعد البيانات والسجلات." },
    { path: "/var/log", fr: "Journaux du système : messages, syslog, auth.log…", ar: "سجلات النظام: messages وsyslog وغيرها." },
    { path: "/dev", fr: "Fichiers spéciaux représentant les périphériques : null, sda, tty…", ar: "ملفات خاصة تمثل الأجهزة: null وsda وtty." },
    { path: "/proc", fr: "Pseudo-système de fichiers du noyau : cpuinfo, version, processus.", ar: "نظام ملفات وهمي للنواة: cpuinfo وversion والعمليات." },
    { path: "/lib", fr: "Bibliothèques partagées nécessaires au démarrage et aux programmes.", ar: "مكتبات مشتركة لازمة للإقلاع والبرامج." },
    { path: "/opt", fr: "Logiciels optionnels installés hors gestionnaire de paquets.", ar: "برمجيات اختيارية مثبتة خارج مدير الحزم." }
  ];
  function initTree() {
    const tree = $("#linux-tree");
    const detail = $("#tree-detail");
    if (!tree || !detail) return;
    function show(node) {
      detail.innerHTML = "<h4>" + node.path + '</h4><div class="td-fr">' + esc(node.fr) + '</div><div class="ar">' + esc(node.ar) + "</div>";
      $$(".tree-node", tree).forEach(function (el) { el.classList.toggle("active", el.getAttribute("data-path") === node.path); });
    }
    tree.innerHTML = TREE.map(function (n) {
      const depth = n.path === "/" ? 0 : n.path.split("/").length - 1;
      const label = n.path === "/" ? "/" : n.path.split("/").pop();
      return '<div class="tree-node" data-path="' + n.path + '" style="padding-left:' + (depth * 16 + 6) + 'px">' +
        '<span class="tn-ico">' + (n.path === "/" ? "🗂" : "📁") + "</span>" +
        '<span class="tn-sub">' + (depth ? "└ " : "") + esc(label) + "</span></div>";
    }).join("");
    $$(".tree-node", tree).forEach(function (el) {
      el.addEventListener("click", function () {
        const node = TREE.find(function (n) { return n.path === el.getAttribute("data-path"); });
        if (node) { show(node); if (window.SFX) window.SFX.play("click"); }
      });
    });
    show(TREE[0]);
  }

  window.BADRAI_OPEN_IMAGES = function (secId, index) { openLightbox(secId, index); };

  /* ============================ Init ============================ */
  function init() {
    renderXP();
    initSound();
    initParticles();
    resizeConfetti();
    initEffects();

    $$(".nav-btn").forEach(function (btn) {
      btn.addEventListener("click", function () { navigate(btn.getAttribute("data-view")); });
    });
    const burger = $("#burger");
    const sidebar = $("#sidebar");
    const backdrop = $("#sidebar-backdrop");
    if (burger) burger.addEventListener("click", function () {
      if (sidebar) sidebar.classList.add("open");
      if (backdrop) backdrop.classList.add("show");
    });
    if (backdrop) backdrop.addEventListener("click", closeSidebar);
    const reset = $("#reset-progress");
    if (reset) reset.addEventListener("click", function () {
      modal("Réinitialiser la progression ?",
        "Sections lues, XP, scores de quiz, note d'examen, missions et cartes maîtrisées seront effacés. Cette action est définitive.",
        [
          { label: "Annuler", cls: "btn-ghost" },
          { label: "Tout effacer", cls: "btn-danger", onClick: function () {
            try {
              localStorage.removeItem(KEY);
              localStorage.removeItem("badrai.se1.term");
            } catch (e) { /* ignore */ }
            location.reload();
          } }
        ]);
    });
    window.addEventListener("resize", resizeConfetti);
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && document.body.classList.contains("locked")) {
        const root = $("#modal-root");
        if (root) root.innerHTML = "";
        document.body.classList.remove("locked");
      }
      if (view === "flash" && !document.body.classList.contains("locked")) {
        const tag = (e.target.tagName || "").toLowerCase();
        if (tag === "input" || tag === "textarea") return;
        if (e.key === "ArrowRight") { const b = $("#next-card"); if (b) { e.preventDefault(); b.click(); } }
        else if (e.key === "ArrowLeft") { const b = $("#prev-card"); if (b) { e.preventDefault(); b.click(); } }
        else if (e.key === " ") { const b = $("#flip-card"); if (b) { e.preventDefault(); b.click(); } }
      }
      if (e.key === "Escape") closeSidebar();
    });

    window.addEventListener("hashchange", function () {
      const next = parseHash();
      if (next.sec) currentSection = next.sec;
      navigate(next.view);
    });

    const route = parseHash();
    if (route.sec) currentSection = route.sec;
    navigate(route.view);
  }

  init();

  /* ============================ Public API ============================ */
  return {
    state: state,
    navigate: navigate,
    openSection: openSection,
    addXP: addXP,
    missionDone: missionDone,
    toast: toast,
    confetti: confetti,
    renderHome: renderHome,
    save: save,
    levelInfo: levelInfo,
    resetMissions: function () { state.missions = []; save(); }
  };
})();
