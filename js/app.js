/* =========================================================
   Badr AI — Application SE1 (SPA vanilla)
   ========================================================= */
window.APP = (function () {
  "use strict";

  const KEY = "badrai.se1.progress";
  const $ = function (sel, root) { return (root || document).querySelector(sel); };
  const $$ = function (sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); };

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

  /* ============================ Term audio (terme FR + sens AR, sans coach) ============================ */
  let termToken = 0;
  let termVoices = null;
  let termVoicesReady = false;
  function termLoadVoices() {
    if (!synthOK()) return;
    termVoices = window.speechSynthesis.getVoices() || [];
    termVoicesReady = termVoices.length > 0;
  }
  if (typeof window.speechSynthesis !== "undefined" && window.speechSynthesis.addEventListener) {
    termLoadVoices();
    window.speechSynthesis.addEventListener("voiceschanged", termLoadVoices);
  }
  function synthOK() {
    return typeof window.speechSynthesis !== "undefined" && typeof window.SpeechSynthesisUtterance !== "undefined";
  }
  function vPick(prefix) {
    if (!synthOK()) return null;
    if (!termVoicesReady) termLoadVoices();
    const vs = termVoices || [];
    for (let i = 0; i < vs.length; i++) {
      if (String(vs[i].lang || "").toLowerCase().indexOf(prefix) === 0) return vs[i];
    }
    return null;
  }
  function speakSeq(items, done) {
    if (!synthOK() || !items.length) return false;
    if (window.VOICE) { try { VOICE.stop(); } catch (e) { /* ignore */ } }
    const token = ++termToken;
    const synth = window.speechSynthesis;
    synth.cancel();
    const seq = [];
    for (let i = 0; i < items.length; i++) {
      const text = String(items[i].text == null ? "" : items[i].text).replace(/\s+/g, " ").trim();
      if (text) seq.push({ text: text, lang: items[i].lang });
    }
    if (!seq.length) return false;
    for (let i = 0; i < seq.length; i++) {
      const last = i === seq.length - 1;
      const u = new SpeechSynthesisUtterance(seq[i].text);
      u.lang = seq[i].lang;
      const v = vPick(String(seq[i].lang).slice(0, 2).toLowerCase());
      if (v) { try { u.voice = v; } catch (e) { /* ignore */ } }
      u.rate = 0.92;
      u.onend = function () {
        if (token !== termToken) return;
        if (last && typeof done === "function") done();
      };
      u.onerror = u.onend;
      synth.speak(u);
    }
    return true;
  }
  function sayTerm(t) {
    return speakSeq([
      { text: t.fr, lang: "fr-FR" },
      { text: t.ar, lang: "ar-SA" }
    ]);
  }
  function sayTermsAll(sec, done) {
    const items = [];
    (sec.terms || []).forEach(function (t) {
      items.push({ text: t.fr, lang: "fr-FR" });
      items.push({ text: t.ar, lang: "ar-SA" });
    });
    return speakSeq(items, done);
  }
  function speakStop() {
    termToken++;
    if (synthOK()) {
      try { window.speechSynthesis.cancel(); } catch (e) { /* ignore */ }
    }
    stopLessonAudio();
  }
  function resetTermsBtn(btn) {
    if (!btn) return;
    btn.textContent = "استمع للمصطلحات";
    btn.setAttribute("aria-pressed", "false");
  }

  /* ============================ Lesson audio (voix neuronale AR pré-générée, offline) ============================ */
  let lessonAudio = null;
  function stopLessonAudio() {
    if (!lessonAudio) return;
    try { lessonAudio.pause(); } catch (e) { /* ignore */ }
    lessonAudio = null;
  }
  function resetListenBtn(btn) {
    if (!btn) return;
    btn.textContent = "استمع للشرح";
    btn.setAttribute("aria-pressed", "false");
  }
  function playLessonAudio(sec, onEnd) {
    const src = (window.AUDIO_FILES || {})[sec.id];
    if (!src) return false;
    stopLessonAudio();
    let a;
    try { a = new Audio(src); } catch (e) { return false; }
    lessonAudio = a;
    const finish = function () {
      if (lessonAudio !== a) return;
      lessonAudio = null;
      if (typeof onEnd === "function") onEnd();
    };
    a.addEventListener("ended", finish);
    a.addEventListener("error", finish);
    const p = a.play();
    if (p && p.catch) p.catch(finish);
    return true;
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
    if (window.VOICE) VOICE.say("mission_done");
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

  /* Les effets décoratifs ont été retirés : interface calme, sans animation. */

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

  /* ============================ Voice coach ============================ */
  let voiceCardSync = null;
  let voiceCardStatus = null;
  let voiceCardBound = false;

  function syncVoice() {
    if (!window.VOICE) return;
    const on = !!VOICE.getSettings().enabled;
    document.documentElement.classList.toggle("voice-on", on);
    document.documentElement.classList.toggle("voice-off", !on);
    $$("#voice-toggle, #voice-toggle-top").forEach(function (b) {
      b.setAttribute("title", on ? "إيقاف المرافق الصوتي" : "تشغيل المرافق الصوتي");
      b.setAttribute("aria-label", on ? "إيقاف المرافق الصوتي" : "تشغيل المرافق الصوتي");
      b.setAttribute("aria-pressed", on ? "true" : "false");
      b.classList.toggle("voice-active", on);
    });
  }

  function initVoice() {
    if (!window.VOICE) return;
    VOICE.init();
    syncVoice();
    $$("#voice-toggle, #voice-toggle-top").forEach(function (b) {
      b.addEventListener("click", function () {
        if (!VOICE.isSupported()) {
          toast("هذا المتصفح لا يدعم النطق. جرّب Chrome أو Edge.", "bad");
          return;
        }
        const on = VOICE.toggle();
        syncVoice();
        if (on && !VOICE.hasArabicVoice()) {
          toast("لا يوجد صوت عربي مثبّت. سيحاول المتصفح استخدام الصوت الافتراضي.", "bad");
        } else {
          toast(on ? "المرافق الصوتي مفعّل" : "المرافق الصوتي متوقف", on ? "good" : "");
        }
      });
    });
    document.addEventListener("badrai:voice-settings", syncVoice);
    document.addEventListener("badrai:voice", function (e) {
      const d = e.detail || {};
      const btn = $("#listen-ar");
      if (btn) {
        if (d.type === "start" && d.tag === "section") {
          btn.textContent = "إيقاف الشرح";
          btn.setAttribute("aria-pressed", "true");
        } else if (d.type === "start" || d.type === "end" || d.type === "stop" || d.type === "error") {
          btn.textContent = "استمع للشرح";
          btn.setAttribute("aria-pressed", "false");
        }
      }
      if (d.type === "start") resetTermsBtn($("#listen-terms"));
    });
  }

  function initVoiceCard() {
    const card = $("#voice-card");
    if (!card) return;
    const supported = !!(window.VOICE && VOICE.isSupported());
    const enable = $("#voice-enable", card);
    const select = $("#voice-select", card);
    const rate = $("#voice-rate", card);
    const volume = $("#voice-volume", card);
    const feedback = $("#voice-feedback", card);
    const rateVal = $("#voice-rate-val", card);
    const volumeVal = $("#voice-volume-val", card);
    const status = $("#voice-status", card);
    const badge = $("#voice-badge", card);
    const testBtn = $("#voice-test", card);
    const motivateBtn = $("#voice-motivate", card);
    const stopBtn = $("#voice-stop", card);

    function fillVoices() {
      if (!select) return;
      if (!window.VOICE) return;
      const list = VOICE.getVoices();
      const current = VOICE.getSettings().voiceURI;
      if (!list.length) {
        select.innerHTML = '<option value="">لا يوجد صوت عربي مثبّت</option>';
        select.value = "";
        select.disabled = true;
        return;
      }
      select.disabled = !supported;
      select.innerHTML = '<option value="">تلقائي — أفضل صوت عربي متاح</option>' +
        list.map(function (v) {
          return '<option value="' + esc(v.voiceURI) + '">' + esc(v.name) + " · " + esc(v.lang) +
            (v.local ? " · محلي" : "") + (v.isDefault ? " · افتراضي" : "") + "</option>";
        }).join("");
      select.value = current;
      if (select.value !== current) select.value = "";
    }

    function updateStatus() {
      if (!status || !window.VOICE || !document.body.contains(card)) return;
      if (!supported) {
        status.textContent = "هذا المتصفح لا يدعم النطق. جرّب Chrome أو Edge على الحاسوب، أو Safari على iPhone.";
        status.className = "voice-status warn";
        if (badge) { badge.textContent = "غير مدعوم"; badge.className = "voice-badge off"; }
        return;
      }
      const info = VOICE.voiceInfo();
      const s = VOICE.getSettings();
      if (VOICE.isSpeaking()) {
        status.textContent = "يتحدث الآن… اضغط «إيقاف» لإنهاء الصوت.";
        status.className = "voice-status live";
        if (badge) { badge.textContent = "يتحدث"; badge.className = "voice-badge live"; }
        return;
      }
      if (!info.total) {
        status.textContent = "لا يوجد صوت عربي مثبّت على هذا الجهاز. أضف صوتًا عربيًا من إعدادات النظام ثم أعد تحميل الصفحة. يمكنك تجربة الصوت الافتراضي.";
        status.className = "voice-status warn";
        if (badge) { badge.textContent = "بلا صوت عربي"; badge.className = "voice-badge off"; }
        return;
      }
      status.textContent = s.enabled
        ? "المرافق مفعّل — " + info.total + " صوت عربي متاح (" + info.local + " محلي)."
        : "المرافق متوقف. لن يتحدث تلقائيًا حتى تشغّله.";
      status.className = "voice-status" + (s.enabled ? " on" : "");
      if (badge) {
        badge.textContent = s.enabled ? "مفعّل" : "متوقف";
        badge.className = "voice-badge " + (s.enabled ? "on" : "off");
      }
    }

    function sync() {
      if (!window.VOICE || !document.body.contains(card)) return;
      const s = VOICE.getSettings();
      if (enable) { enable.checked = !!s.enabled; enable.disabled = !supported; }
      if (rate) { rate.value = s.rate; rate.disabled = !supported; }
      if (volume) { volume.value = s.volume; volume.disabled = !supported; }
      if (feedback) { feedback.checked = !!s.feedbackEach; feedback.disabled = !supported; }
      if (rateVal) rateVal.textContent = Number(s.rate).toFixed(2).replace(/0$/, "") + "×";
      if (volumeVal) volumeVal.textContent = Math.round(s.volume * 100) + "%";
      fillVoices();
      updateStatus();
    }

    if (enable) enable.addEventListener("change", function () {
      const ok = VOICE.setEnabled(enable.checked);
      if (!ok) {
        enable.checked = false;
        toast("تعذّر تشغيل الصوت على هذا المتصفح.", "bad");
      }
    });
    if (select) select.addEventListener("change", function () {
      VOICE.setSetting("voiceURI", select.value);
    });
    if (rate) {
      rate.addEventListener("input", function () {
        if (rateVal) rateVal.textContent = Number(rate.value).toFixed(2).replace(/0$/, "") + "×";
      });
      rate.addEventListener("change", function () { VOICE.setSetting("rate", rate.value); });
    }
    if (volume) {
      volume.addEventListener("input", function () {
        if (volumeVal) volumeVal.textContent = Math.round(Number(volume.value) * 100) + "%";
      });
      volume.addEventListener("change", function () { VOICE.setSetting("volume", volume.value); });
    }
    if (feedback) feedback.addEventListener("change", function () {
      VOICE.setSetting("feedbackEach", feedback.checked);
    });
    if (testBtn) testBtn.addEventListener("click", function () {
      if (!VOICE.test()) toast("المتصفح لا يدعم النطق.", "bad");
    });
    if (motivateBtn) motivateBtn.addEventListener("click", function () {
      if (!VOICE.motivate()) toast("المتصفح لا يدعم النطق.", "bad");
    });
    if (stopBtn) stopBtn.addEventListener("click", function () { VOICE.stop(); });

    voiceCardSync = sync;
    voiceCardStatus = updateStatus;
    if (!voiceCardBound) {
      voiceCardBound = true;
      document.addEventListener("badrai:voice-settings", function () {
        if (voiceCardSync) voiceCardSync();
      });
      document.addEventListener("badrai:voice", function (e) {
        const type = e.detail && e.detail.type;
        if (type === "voices") {
          if (voiceCardSync) voiceCardSync();
        } else if (voiceCardStatus) {
          voiceCardStatus();
        }
      });
    }
    sync();
  }

  /* ============================ Router ============================ */
  const TITLES = {
    home: ["Badr AI", "Accueil"],
    cours: ["Programme", "Cours"],
    terminal: ["Atelier Unix", "Terminal"],
    quiz: ["Quiz", "Quiz"],
    flash: ["Révision", "Flashcards"],
    exam: ["Examen blanc", "Examen"],
    outils: ["Outils", "Outils"]
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
    if (window.VOICE) VOICE.stop();
    view = name;
    $$(".view").forEach(function (v) { v.classList.toggle("active", v.id === "view-" + name); });
    $$(".nav-btn").forEach(function (b) {
      const on = b.getAttribute("data-view") === name;
      b.classList.toggle("active", on);
      if (on) b.setAttribute("aria-current", "page");
      else b.removeAttribute("aria-current");
    });
    const t = TITLES[name];
    document.title = name === "home" ? "Badr AI — Cours Système d'Exploitation 1 (SE1)" : t[1] + " — Badr AI";
    closeMenu();
    if (name === "home") renderHome();
    else if (name === "cours") renderCours();
    else if (name === "terminal") { if (window.TERM) TERM.mount($("#terminal-root")); }
    else if (name === "quiz") renderQuiz();
    else if (name === "flash") renderFlash();
    else if (name === "exam") renderExam();
    else if (name === "outils") renderTools();
    const hash = name === "cours" && currentSection ? "#cours/" + currentSection : "#" + name;
    try { history.replaceState(null, "", hash); } catch (e) { /* file:// */ }
    window.scrollTo(0, 0);
  }

  function openSection(id) {
    if (!SECMAP[id]) return;
    currentSection = id;
    navigate("cours");
    if (window.innerWidth <= 900) {
      setTimeout(function () {
        const reader = $("#reader");
        if (reader) reader.scrollIntoView({ block: "start" });
      }, 40);
    }
  }

  function closeMenu() {
    const menu = $("#mobile-menu"), btn = $("#menu-toggle");
    if (menu) menu.hidden = true;
    if (btn) {
      btn.setAttribute("aria-expanded", "false");
      btn.setAttribute("aria-label", "Ouvrir le menu");
    }
  }

  /* ============================ Ring helper ============================ */
  function ringSVG(pct, size, stroke) {
    size = size || 96; stroke = stroke || 8;
    const r = (size - stroke) / 2, c = 2 * Math.PI * r;
    const off = c * (1 - clamp(pct, 0, 100) / 100);
    const cx = size / 2;
    return '<svg viewBox="0 0 ' + size + " " + size + '" width="' + size + '" height="' + size + '" aria-hidden="true">' +
      '<circle class="ring-track" cx="' + cx + '" cy="' + cx + '" r="' + r + '" fill="none" stroke-width="' + stroke + '"/>' +
      '<circle cx="' + cx + '" cy="' + cx + '" r="' + r + '" fill="none" stroke="#0071e3" stroke-width="' + stroke +
      '" stroke-linecap="round" stroke-dasharray="' + c.toFixed(1) + '" stroke-dashoffset="' + off.toFixed(1) + '"/>' +
      "</svg>";
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
        '<h3 id="lg-title">Illustrations de la leçon</h3>' +
        '<span class="lg-count">' + imgs.length + (imgs.length > 1 ? " illustrations" : " illustration") +
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
    const nextSec = SECTIONS.find(function (it) { return !state.read[it.sec.id]; }) || SECTIONS[0];

    const chaptersHtml = COURS.chapters.map(function (ch) {
      const rd = chapterRead(ch);
      const p = Math.round(rd / ch.sections.length * 100);
      return '<article class="chapter-card">' +
        '<div class="chapter-top">' +
          '<span class="chapter-index">Chapitre ' + ch.num + "</span>" +
          '<span class="chapter-count">' + ch.sections.length + " leçons</span>" +
        "</div>" +
        "<h3>" + esc(ch.title) + "</h3>" +
        '<p class="chapter-ar ar" lang="ar" dir="rtl">' + esc(ch.ar) + "</p>" +
        '<div class="chapter-progress"><div class="progress"><i style="width:' + p + '%"></i></div>' +
          "<span>" + rd + "/" + ch.sections.length + "</span></div>" +
        '<button class="link-btn" type="button" data-ch="' + ch.id + '">Ouvrir le chapitre <span aria-hidden="true">›</span></button>' +
        "</article>";
    }).join("");

    host.innerHTML =
      '<section class="hero">' +
        '<span class="eyebrow">Badr AI · Système d\'Exploitation 1</span>' +
        "<h1>Comprendre en arabe.<br>Réussir en français.</h1>" +
        '<p class="hero-ar" lang="ar" dir="rtl">افهم بالعربية، راجع بالفرنسية، واستعد للامتحان بثقة.</p>' +
        '<p class="hero-desc">Le cours SE1 complet, les QCM corrigés, les flashcards et un terminal Unix interactif. Un espace calme, hors-ligne et sans compte.</p>' +
        '<div class="hero-cta">' +
          '<button class="btn btn-primary btn-lg" id="hero-continue" type="button">Continuer le cours</button>' +
          '<button class="btn-link" data-go="exam" type="button">Passer l\'examen blanc <span aria-hidden="true">›</span></button>' +
          '<button class="btn-link" id="hero-motivate" type="button" lang="ar" dir="rtl">حفّزني</button>' +
        "</div>" +
        '<div class="hero-meta">' +
          "<span><b>" + COURS.chapters.length + "</b> chapitres</span>" +
          "<span><b>" + TOTAL_SECTIONS + "</b> leçons</span>" +
          "<span><b>" + QUIZ.questions.length + "</b> QCM corrigés</span>" +
          "<span><b>" + FLASH.cards.length + "</b> flashcards</span>" +
        "</div>" +
      "</section>" +

      '<div class="home-block"><div class="progress-card">' +
        '<div class="progress-ring">' + ringSVG(pct, 96, 8) + "<b>" + pct + "%</b></div>" +
        '<div class="progress-main">' +
          "<h2>Votre progression</h2>" +
          "<p>" + done + " leçons sur " + TOTAL_SECTIONS + " · Niveau " + li.level + " · " + li.xp + " XP</p>" +
          '<div class="progress"><i style="width:' + pct + '%"></i></div>' +
        "</div>" +
        '<div class="progress-stats">' +
          "<div><b>" + (bestQuiz == null ? "—" : bestQuiz + "%") + "</b><span>Meilleur quiz</span></div>" +
          "<div><b>" + state.missions.length + "/16</b><span>Missions Unix</span></div>" +
          "<div><b>" + known + "/" + FLASH.cards.length + "</b><span>Cartes maîtrisées</span></div>" +
        "</div>" +
      "</div></div>" +

      '<div class="home-block">' +
        '<div class="section-head"><div><h2>Programme</h2><p>Trois chapitres, du premier concept au script Shell.</p></div>' +
          '<button class="btn btn-sm" data-go="cours" type="button">Voir toutes les leçons</button></div>' +
        '<div class="chapter-grid">' + chaptersHtml + "</div>" +
      "</div>" +

      '<div class="home-block two-col">' +
        '<article class="next-card">' +
          '<span class="eyebrow">Reprendre</span>' +
          "<h3>" + esc(nextSec.sec.fr) + "</h3>" +
          '<p class="ar" lang="ar" dir="rtl">' + esc(nextSec.sec.ar) + "</p>" +
          '<button class="btn btn-primary btn-sm" data-open="' + nextSec.sec.id + '" type="button">Lire la leçon</button>' +
        "</article>" +
        '<article class="exam-teaser">' +
          '<span class="eyebrow">Examen blanc</span>' +
          "<h3>20 questions · 30 minutes</h3>" +
          "<p>Conditions réelles, chronomètre et correction détaillée en arabe. Votre meilleure note est conservée.</p>" +
          '<div style="display:flex;gap:8px;flex-wrap:wrap">' +
            '<button class="btn btn-primary btn-sm" data-go="exam" type="button">Commencer</button>' +
            '<button class="btn btn-sm" data-go="quiz" type="button">Quiz rapide</button>' +
          "</div>" +
        "</article>" +
      "</div>" +

      '<div class="tip-line"><span class="eyebrow">Conseil</span><span>' + esc(tip) + "</span></div>";

    const cont = $("#hero-continue");
    if (cont) cont.addEventListener("click", function () { openSection(nextSec.sec.id); });
    const motivate = $("#hero-motivate");
    if (motivate) motivate.addEventListener("click", function () {
      if (!window.VOICE || !VOICE.isSupported()) {
        toast("هذا المتصفح لا يدعم النطق. جرّب Chrome أو Edge.", "bad");
      } else if (!VOICE.motivate()) {
        toast("تعذّر تشغيل الصوت الآن.", "bad");
      }
    });
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
        '<div class="empty-state"><span class="empty-kicker">Programme</span>' +
        "<h3>Choisissez une leçon</h3>" +
        "<p>" + COURS.chapters.length + " chapitres et " + TOTAL_SECTIONS +
        " leçons. Chaque leçon commence par une explication en arabe, puis le cours en français.</p></div>";
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
    if (!pg.blocks || !pg.blocks.length) return "";
    return pg.blocks.map(function (b) {
      if (b.k === "h") return '<h3 class="page-h">' + esc(b.v) + "</h3>";
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
    stopLessonAudio();
    const ch = item.ch, sec = item.sec;
    const idx = SECTIONS.findIndex(function (s) { return s.sec.id === id; });
    const prev = SECTIONS[idx - 1], next = SECTIONS[idx + 1];
    const isRead = !!state.read[id];
    const pagesHtml = sec.pages.map(pageBlocksHTML).join("");
    const gallery = galleryHTML(id);
    const hasTerms = !!(sec.terms && sec.terms.length);

    reader.innerHTML =
      '<div class="reader-head">' +
        '<div class="rh-main">' +
          '<div class="crumbline">Chapitre ' + ch.num + " · Leçon " + (idx + 1) + " sur " + TOTAL_SECTIONS + "</div>" +
          "<h2>" + esc(sec.fr) + "</h2>" +
          '<div class="sec-ar ar" lang="ar" dir="rtl">' + esc(sec.ar) + "</div>" +
        "</div>" +
        '<div class="rh-actions">' +
          '<button class="btn btn-sm btn-ghost" id="listen-ar" type="button" aria-pressed="false" title="Écouter l\'explication en arabe">استمع للشرح</button>' +
          (hasTerms ? '<button class="btn btn-sm btn-ghost" id="listen-terms" type="button" aria-pressed="false" title="Écouter les termes techniques">استمع للمصطلحات</button>' : "") +
          '<button class="btn btn-sm btn-ghost" id="toggle-ar" type="button" title="Afficher ou masquer l\'arabe">إخفاء العربية</button>' +
          '<button class="btn btn-sm ' + (isRead ? "btn-soft" : "btn-primary") + '" id="mark-read" type="button">' +
            (isRead ? "Leçon lue" : "Marquer comme lu") + "</button>" +
        "</div>" +
      "</div>" +
      '<div class="reader-body">' +
        '<div class="ar-panel open" id="ar-panel" lang="ar" dir="rtl">' +
          "<h3>الشرح بالعربية</h3>" +
          '<p class="ar">' + esc(sec.arText) + "</p>" +
          (hasTerms ? '<div class="terms">' + sec.terms.map(function (t, i) {
            return '<button class="term" type="button" data-ti="' + i + '" aria-label="Écouter le terme : ' + esc(t.fr) + '">' +
              "<b>" + esc(t.fr) + "</b><span>" + esc(t.ar) + "</span>" +
              '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M11 5 6 9H2v6h4l5 4V5z"/><path d="M15.5 8.5a5 5 0 0 1 0 7"/></svg>' +
              "</button>";
          }).join("") + "</div>" : "") +
        "</div>" +
        gallery +
        '<div class="lesson-flow">' + pagesHtml + "</div>" +
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
      toggle.textContent = p.classList.contains("open") ? "إخفاء العربية" : "إظهار العربية";
    });
    const listen = $("#listen-ar");
    if (listen) {
      if (!window.VOICE || !VOICE.isSupported()) {
        listen.hidden = true;
      } else {
        listen.addEventListener("click", function () {
          if (listen.getAttribute("aria-pressed") === "true") {
            stopLessonAudio();
            resetListenBtn(listen);
            VOICE.stop();
          } else {
            speakStop();
            resetTermsBtn($("#listen-terms"));
            if (playLessonAudio(sec, function () { resetListenBtn(listen); })) {
              listen.textContent = "إيقاف الشرح";
              listen.setAttribute("aria-pressed", "true");
            } else if (!VOICE.speakArabic(sec.arText, { tag: "section" })) {
              toast("تعذّر تشغيل الصوت الآن.", "bad");
            }
          }
        });
      }
    }
    const listenTerms = $("#listen-terms");
    if (listenTerms) {
      if (!synthOK()) {
        listenTerms.hidden = true;
      } else {
        listenTerms.addEventListener("click", function () {
          if (listenTerms.getAttribute("aria-pressed") === "true") {
            speakStop();
            resetTermsBtn(listenTerms);
          } else if (!sayTermsAll(sec, function () { resetTermsBtn(listenTerms); })) {
            toast("تعذّر تشغيل الصوت الآن.", "bad");
          } else {
            listenTerms.textContent = "إيقاف المصطلحات";
            listenTerms.setAttribute("aria-pressed", "true");
          }
        });
      }
    }
    if (hasTerms && synthOK()) {
      $$(".term", reader).forEach(function (b) {
        b.addEventListener("click", function () {
          const t = sec.terms[parseInt(b.getAttribute("data-ti"), 10) || 0];
          if (!t) return;
          speakStop();
          resetTermsBtn(listenTerms);
          if (!sayTerm(t)) toast("تعذّر تشغيل الصوت الآن.", "bad");
        });
      });
    }
    const mark = $("#mark-read");
    if (mark) mark.addEventListener("click", function () {
      if (!state.read[id]) {
        state.read[id] = true;
        addXP(10, "Leçon lue");
        save();
        if (window.SFX) window.SFX.play("success");
        if (window.VOICE) VOICE.say("section_done");
      }
      mark.textContent = "Leçon lue";
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
        '<span class="qc-ico">' + String(ch.num).padStart(2, "0") + "</span>" +
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
            '<span class="qc-ico">20</span><b>Tout le cours</b>' +
            "<span>20 questions mélangées sur les 3 chapitres</span>" +
            "<small>" + (state.quiz.all == null ? "Mode examen rapide" : "Meilleur score : " + state.quiz.all + "%") + "</small>" +
          "</button>" +
        "</div>" +
        '<div class="tip-line" style="margin-top:18px"><span class="eyebrow">Conseil</span><span>Après chaque réponse, l\'explication arabe vous explique le piège — lisez-la même si vous avez juste.</span></div>' +
      "</div>";

    $$("[data-scope]", host).forEach(function (b) {
      b.addEventListener("click", function () { startQuiz(b.getAttribute("data-scope")); });
    });
  }

  function startQuiz(scope) {
    const pool = shuffle(quizPool(scope)).slice(0, scope === "all" ? 20 : 10).map(prepQuestion);
    quizSession = { scope: scope, items: pool, idx: 0, answers: pool.map(function () { return null; }), correct: 0 };
    if (window.VOICE) VOICE.say("quiz_start");
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
        if (window.VOICE) VOICE.feedback(good);
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
    const sub = pct >= 60 ? "Vous êtes sur la bonne voie pour l'examen." : "Relisez les leçons concernées puis retentez le quiz.";
    if (window.VOICE) VOICE.say(pct >= 80 ? "quiz_result_high" : pct >= 60 ? "quiz_result_mid" : "quiz_result_low");
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
          : '<div class="review-list"><div class="review-item"><div class="ri-q">Aucune erreur — sans faute.</div><div class="ri-ar">ممتاز، أتقنت هذا الجزء. جرّب فصلًا آخر أو الامتحان الكامل.</div></div></div>') +
        '<div class="result-actions">' +
          '<button class="btn btn-primary" id="retry-quiz" type="button">Recommencer</button>' +
          '<button class="btn" id="other-quiz" type="button">Choisir un autre quiz</button>' +
          '<button class="btn btn-ghost" id="goto-cours" type="button">Revoir le cours</button>' +
        "</div>" +
      "</div></div>";
    if (pct >= 60 && window.SFX) window.SFX.play("fanfare");
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
          '<button class="deck-chip" id="shuffle-cards" type="button">Mélanger</button>' +
        "</div>" +
        '<div class="flash-stage"><div class="flash-card' + (flashView.flipped ? " flipped" : "") + '" id="flash-card" tabindex="0" role="button" aria-label="Afficher la réponse">' +
          '<div class="flash-face front">' +
            '<span class="flash-cat">' + esc(deckName) + " · " + (flashView.idx + 1) + "/" + order.length + "</span>" +
            '<div class="flash-front-text">' + esc(card.front) + "</div>" +
            '<div class="flash-hint">' + esc(card.hint || "") + "</div>" +
            '<div class="flash-hint" style="margin-top:6px">Cliquez pour afficher la réponse</div>' +
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
          '<button class="btn" id="prev-card" type="button">Précédente</button>' +
          '<button class="btn btn-soft" id="flip-card" type="button">Voir la réponse</button>' +
          '<button class="btn btn-danger" id="review-card" type="button">À revoir</button>' +
          '<button class="btn btn-primary" id="known-card" type="button">Je connais</button>' +
          '<button class="btn" id="next-card" type="button">Suivante</button>' +
        "</div>" +
        '<div class="flash-stats"><span><b>' + deckKnown + "</b> / " + order.length + " maîtrisées dans ce deck</span><span>·</span><span>" + known.length + " au total</span></div>" +
        '<div class="progress flash-progress"><i style="width:' + pct + '%"></i></div>' +
      "</div>";

    function flip() {
      flashView.flipped = !flashView.flipped;
      const el = $("#flash-card");
      if (el) {
        el.classList.toggle("flipped", flashView.flipped);
        el.setAttribute("aria-label", flashView.flipped ? "Revenir à la question" : "Afficher la réponse");
      }
      const fb = $("#flip-card");
      if (fb) fb.textContent = flashView.flipped ? "Voir la question" : "Voir la réponse";
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
      const before = state.flash.known.length;
      if (state.flash.known.indexOf(card.id) === -1) {
        state.flash.known.push(card.id);
        save();
        addXP(5, "Carte maîtrisée");
        if (window.SFX) window.SFX.play("success");
      }
      const after = state.flash.known.length;
      if (after > before && (after === 10 || after === 30 || after === 60 || after === 90) && window.VOICE) {
        VOICE.say("flash_milestone");
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
    el.textContent = fmtTime(left);
    el.classList.toggle("danger", left < 5 * 60 * 1000);
    if (left > 0 && left <= 5 * 60 * 1000 && !examSession.warned5) {
      examSession.warned5 = true;
      if (window.VOICE) VOICE.say("exam_five_min");
    }
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
          '<div class="rule"><b>20 questions</b> Tirées au hasard sur les 3 chapitres, sans doublon.</div>' +
          '<div class="rule"><b>30 minutes</b> Chronomètre réel, remise automatique à la fin du temps.</div>' +
          '<div class="rule"><b>Note /20</b> Pas de correction immédiate — tout est corrigé à la remise.</div>' +
        "</div>" +
        '<div class="card" style="display:flex;gap:22px;align-items:center;flex-wrap:wrap;padding:26px">' +
          '<div class="ring-wrap">' + ringSVG(pct, 64, 6, "examBest") + "<b>" + best + "</b></div>" +
          '<div style="flex:1;min-width:220px">' +
            '<h3 style="margin:0 0 4px">' + (attempts ? "Meilleure note : " + best + "/20" : "Aucune tentative pour le moment") + "</h3>" +
            '<p class="small muted" style="margin:0">' + (attempts ? attempts + " tentative(s) enregistrée(s). Objectif : 14/20 ou plus." : "Mettez-vous en conditions réelles : une seule feuille, pas de notes, un chronomètre.") + "</p>" +
          "</div>" +
          '<button class="btn btn-primary btn-lg" id="start-exam" type="button">Commencer l\'examen →</button>' +
        "</div>" +
        '<div class="tip-line" style="margin-top:18px"><span class="eyebrow">Barème</span><span>1 point par bonne réponse. Une question sans réponse ne rapporte rien et ne retire rien.</span></div>' +
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
    if (window.VOICE) VOICE.say("exam_start");
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
          '<span class="exam-timer' + (left < 5 * 60 * 1000 ? " danger" : "") + '" id="exam-timer">' + fmtTime(left) + "</span>" +
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
            '<div class="exam-legend"><b style="color:var(--accent)">■</b> Répondue · <b style="color:var(--line)">□</b> Courante<br>Sans réponse : 0 point.</div>' +
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
    if (window.VOICE) VOICE.say(correct >= 16 ? "exam_high" : correct >= 10 ? "exam_mid" : "exam_low");
    const note = correct >= 16 ? "Très bien — niveau examen validé." :
      correct >= 12 ? "Bien — encore quelques pièges à sécuriser." :
      correct >= 8 ? "Passable — relisez les chapitres faibles." :
      "Insuffisant — reprenez le cours puis retentez.";
    const host = $("#exam-root");
    host.innerHTML =
      '<div class="quiz-result"><div class="card result-card">' +
        '<div class="result-ring">' + ringSVG(pct, 150, 11, "examGrad") +
          "<b>" + correct + "/20</b><small>" + pct + "%</small></div>" +
        '<div class="result-note">' + (correct >= 14 ? "Objectif atteint." : correct >= 10 ? "Presque." : "Il faut retravailler.") + "</div>" +
        '<p class="result-sub">' + note + (unanswered ? " · " + unanswered + " sans réponse" : "") + "</p>" +
        '<div class="review-list">' + s.items.map(function (q, i) {
          const pick = s.answers[i];
          const good = pick === q.a;
          return '<div class="review-item" style="border-color:' + (good ? "rgba(29,127,78,.3)" : "rgba(196,54,47,.28)") + '">' +
            '<div class="ri-q">' + (good ? "✓" : "✗") + " " + (i + 1) + ". " + esc(q.text) + "</div>" +
            '<div class="ri-a" style="color:' + (good ? "var(--green)" : "var(--red)") + '">' +
              (pick == null ? "Sans réponse" : "Votre réponse : " + esc(q.choices[pick])) +
              (good ? "" : " · Bonne réponse : " + esc(q.choices[q.a])) + "</div>" +
            '<div class="ri-ar">' + esc(q.ar) + "</div></div>";
        }).join("") + "</div>" +
        '<div class="result-actions">' +
          '<button class="btn btn-primary" id="new-exam" type="button">Nouvel examen</button>' +
          '<button class="btn" id="exam-quiz" type="button">Quiz ciblé</button>' +
          '<button class="btn btn-ghost" id="exam-cours" type="button">Revoir le cours</button>' +
        "</div>" +
      "</div></div>";
    examSession = null;
    if (pct >= 70 && window.SFX) window.SFX.play("fanfare");
    $("#new-exam").addEventListener("click", function () { renderExam(); });
    $("#exam-quiz").addEventListener("click", function () { navigate("quiz"); });
    $("#exam-cours").addEventListener("click", function () { navigate("cours"); });
    if (view === "home") renderHome();
  }

  /* ============================ Outils ============================ */
  const PERMS = ["---", "--x", "-w-", "-wx", "r--", "r-x", "rw-", "rwx"];

  function toolIcon(name) {
    const paths = {
      lock: '<rect x="4" y="10" width="16" height="10" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/>',
      power: '<path d="M12 3v9"/><path d="M6.6 6.6a8 8 0 1 0 10.8 0"/>',
      folder: '<path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2Z"/>',
      mic: '<rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5.5 11.5a6.5 6.5 0 0 0 13 0M12 18v3M9 21h6"/>'
    };
    return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" ' +
      'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + paths[name] + "</svg>";
  }

  function renderTools() {
    const host = $("#outils-root");
    if (!host) return;
    const roleNames = { u: "u · Propriétaire", g: "g · Groupe", o: "o · Autres" };
    const roleDesc = { u: "المالك", g: "المجموعة", o: "الآخرون" };

    host.innerHTML =
      '<div class="section-head"><div><h2>Outils interactifs</h2>' +
        "<p>Manipulez les notions qui tombent le plus à l'examen : droits, démarrage, arborescence.</p></div>" +
        '<span class="chip chip-soft">4 outils</span></div>' +
      '<div class="tools-grid">' +

        '<section class="card tool-card">' +
          '<div class="tool-head"><div class="card-ico">' + toolIcon("lock") + '</div><div><h3>Calculateur chmod</h3><p>Octal ↔ rwx ↔ symbolique, en direct.</p></div></div>' +
          '<div class="chmod-grid">' +
            ["u", "g", "o"].map(function (role, idx) {
              return '<div class="perm-col"><h4>' + esc(roleNames[role]) + "</h4>" +
                ["r", "w", "x"].map(function (p, bit) {
                  const weight = [4, 2, 1][bit];
                  return '<label><input type="checkbox" data-role="' + role + '" data-bit="' + weight + '"' +
                    (idx === 0 || (role === "g" && p !== "x") || (role === "o" && p !== "x") ? "" : "") + "> " +
                    p + " — " + (p === "r" ? "lire" : p === "w" ? "écrire" : "exécuter") + " (" + weight + ")</label>";
                }).join("") +
                '<div style="font-size:.64rem;color:var(--text-3);margin-top:4px;direction:rtl;text-align:right">' + roleDesc[role] + "</div></div>";
            }).join("") +
          "</div>" +
          '<div class="chmod-result">' +
            '<div class="octal-box"><span>Octal</span><input id="octal-input" inputmode="numeric" maxlength="3" value="755" aria-label="Valeur octale"></div>' +
            '<div class="symbolic-box" id="symbolic-out">rwxr-xr-x</div>' +
            '<label style="display:inline-flex;align-items:center;gap:7px;font-size:.74rem;color:var(--text-2);margin-left:auto"><input type="checkbox" id="chmod-dir" style="accent-color:var(--accent)"> Dossier</label>' +
          "</div>" +
          '<div class="ls-preview" id="ls-preview"></div>' +
          '<div class="chmod-note">r = 4 · w = 2 · x = 1. Pour un dossier, x = droit de le traverser (entrer).<br><span class="ar" style="display:block;margin-top:6px">r قراءة، w كتابة، x تنفيذ — وللمجلد x يعني حق الدخول/العبور.</span></div>' +
        "</section>" +

        '<section class="card tool-card">' +
          '<div class="tool-head"><div class="card-ico">' + toolIcon("power") + '</div><div><h3>Séquence de démarrage</h3><p>Du bouton power au prompt du shell.</p></div></div>' +
          '<div class="boot-steps" id="boot-steps"></div>' +
          '<div class="boot-panel" id="boot-panel"></div>' +
          '<div class="exam-actions"><button class="btn btn-primary btn-sm" id="boot-play" type="button">▶ Lancer la séquence</button>' +
          '<button class="btn btn-sm" id="boot-reset" type="button">Réinitialiser</button></div>' +
        "</section>" +

        '<section class="card tool-card wide">' +
          '<div class="tool-head"><div class="card-ico">' + toolIcon("folder") + '</div><div><h3>Arborescence Linux</h3><p>Cliquez sur un dossier pour découvrir son rôle.</p></div></div>' +
          '<div class="tree-layout">' +
            '<div class="tree" id="linux-tree"></div>' +
            '<div class="tree-detail" id="tree-detail"></div>' +
          "</div>" +
        "</section>" +

        '<section class="card tool-card wide voice-card" id="voice-card">' +
          '<div class="tool-head"><div class="card-ico">' + toolIcon("mic") + '</div><div><h3>المرافق الصوتي — Coach vocal</h3><p>تحفيز وتوجيه بالعربية، اختياري ويعمل محليًا.</p></div>' +
            '<span class="voice-badge off" id="voice-badge">متوقف</span></div>' +
          '<div class="voice-grid">' +
            '<div class="voice-col">' +
              '<label class="voice-switch"><input type="checkbox" id="voice-enable">' +
                '<span class="vs-track" aria-hidden="true"><span class="vs-dot"></span></span>' +
                '<span class="vs-label">تشغيل المرافق الصوتي</span></label>' +
              '<p class="voice-help">يتحدث عند إكمال درس، إجابة في الاختبار، مهمة طرفية، نتيجة امتحان، أو عند الضغط على «حفّزني».</p>' +
              '<label class="voice-field" for="voice-select"><span>الصوت العربي</span>' +
                '<select id="voice-select" class="input voice-select"><option value="">تلقائي — أفضل صوت عربي متاح</option></select></label>' +
            "</div>" +
            '<div class="voice-col">' +
              '<label class="voice-field" for="voice-rate"><span>السرعة <b id="voice-rate-val">0.95×</b></span>' +
                '<input type="range" id="voice-rate" min="0.7" max="1.2" step="0.05" value="0.95"></label>' +
              '<label class="voice-field" for="voice-volume"><span>مستوى الصوت <b id="voice-volume-val">90%</b></span>' +
                '<input type="range" id="voice-volume" min="0" max="1" step="0.05" value="0.9"></label>' +
              '<label class="voice-check"><input type="checkbox" id="voice-feedback" checked> <span>تغذية راجعة بعد كل إجابة</span></label>' +
            "</div>" +
          "</div>" +
          '<div class="voice-actions">' +
            '<button class="btn btn-primary btn-sm" id="voice-test" type="button">اختبار الصوت</button>' +
            '<button class="btn btn-sm" id="voice-motivate" type="button">حفّزني</button>' +
            '<button class="btn btn-sm btn-ghost" id="voice-stop" type="button">إيقاف</button>' +
          "</div>" +
          '<div class="voice-status" id="voice-status" role="status" aria-live="polite">جارٍ فحص الأصوات المتاحة…</div>' +
          '<p class="voice-note" id="voice-note">الخصوصية: لا يرسل Badr AI أي صوت أو نص إلى خوادم خارجية. قد يستخدم المتصفح أصواتًا محلية أو سحابية حسب نظامك؛ اختر صوتًا «محليًا» للعمل دون اتصال. إن كنت تستخدم قارئ الشاشة، اترك المرافق متوقفًا لتجنب تعارض الصوت.</p>' +
        "</section>" +

      "</div>";

    initChmod();
    initBoot();
    initTree();
    initVoiceCard();
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
    { key: "bios", title: "BIOS", sub: "ROM", fr: "Au démarrage, le BIOS (stocké dans la ROM) teste le matériel, initialise les périphériques puis cherche un périphérique de démarrage.", ar: "عند التشغيل يُنفَّذ BIOS من ROM: يفحص العتاد، يهيئ الأجهزة ويبحث عن قرص الإقلاع." },
    { key: "grub", title: "GRUB", sub: "Boot loader", fr: "GRUB est le chargeur d'amorçage : il affiche le menu (Windows / Linux), charge le noyau choisi et lui transmet les paramètres.", ar: "GRUB هو محمّل الإقلاع: يعرض قائمة الأنظمة، يحمّل النواة المختارة ويمرر لها الإعدادات." },
    { key: "noyau", title: "Noyau", sub: "kernel", fr: "Le noyau est chargé en mémoire, initialise les pilotes et lance le premier processus (init/systemd) qui démarrera les services.", ar: "تُحمَّل النواة في الذاكرة، تهيئ التعريفات وتطلق أول عملية (init/systemd) التي تشغل الخدمات." },
    { key: "shell", title: "Shell", sub: "bash", fr: "Le shell démarre, lit .bashrc/.profile, affiche l'invite et attend vos commandes. Le système est prêt.", ar: "يبدأ الشل، يقرأ .bashrc/.profile، يعرض الدعوة وينتظر أوامرك. النظام جاهز." }
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
        '<div class="bs-ico">' + String(i + 1).padStart(2, "0") + "</div><b>" + b.title + "</b><span>" + b.sub + "</span></button>";
    }).join("");
    function show(i) {
      $$(".boot-step", steps).forEach(function (el, k) {
        el.classList.toggle("active", k === i);
        el.classList.toggle("done", k < i);
      });
      const b = BOOT[i];
      panel.innerHTML = "<h4>" + b.title + " <span style='color:var(--text-3);font-size:.7rem'>(" + b.sub + ")</span></h4>" +
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
        '<span class="tn-ico">' + (n.path === "/" ? "" : "›") + "</span>" +
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
    initVoice();

    $$(".nav-btn").forEach(function (btn) {
      btn.addEventListener("click", function () { navigate(btn.getAttribute("data-view")); });
    });

    const menuBtn = $("#menu-toggle");
    const menu = $("#mobile-menu");
    if (menuBtn && menu) {
      menuBtn.addEventListener("click", function () {
        const open = menu.hidden;
        menu.hidden = !open;
        menuBtn.setAttribute("aria-expanded", open ? "true" : "false");
        menuBtn.setAttribute("aria-label", open ? "Fermer le menu" : "Ouvrir le menu");
      });
      document.addEventListener("click", function (e) {
        if (!e.target.closest(".site-header")) closeMenu();
      });
      window.addEventListener("resize", function () {
        if (window.innerWidth > 1060) closeMenu();
      });
    }

    const reset = $("#reset-progress");
    if (reset) reset.addEventListener("click", function () {
      modal("Réinitialiser la progression ?",
        "Leçons lues, XP, scores de quiz, note d'examen, missions et cartes maîtrisées seront effacés. Cette action est définitive.",
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
      if (e.key === "Escape") closeMenu();
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
    voice: window.VOICE,
    navigate: navigate,
    openSection: openSection,
    addXP: addXP,
    missionDone: missionDone,
    toast: toast,
    confetti: function () { /* les effets décoratifs ont été retirés */ },
    renderHome: renderHome,
    save: save,
    levelInfo: levelInfo,
    resetMissions: function () { state.missions = []; save(); }
  };
})();
