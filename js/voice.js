/* =========================================================
   Badr AI — Arabic voice coach (Web Speech API)
   Opt-in · no tracking · no network request from this module
   ========================================================= */
window.VOICE = (function () {
  "use strict";

  const KEY = "badrai.se1.voice";
  const DEFAULTS = {
    enabled: false,
    rate: 0.95,
    pitch: 1,
    volume: 0.9,
    voiceURI: "",
    feedbackEach: true
  };

  const PHRASES = {
    enabled: [
      "تم تشغيل المرافق الصوتي. سأشجعك وأوجّهك أثناء الدراسة. يمكنك إيقافي في أي وقت من زر الصوت."
    ],
    disabled: [
      "تم إيقاف المرافق الصوتي."
    ],
    section_done: [
      "أحسنت! أنهيت هذا الدرس. خطوة صغيرة أخرى نحو الإتقان.",
      "ممتاز، درس مكتمل. خذ نفسًا قصيرًا ثم واصل.",
      "عمل جيد. المعلومات تثبت عندما تعود إليها للمراجعة لاحقًا."
    ],
    quiz_start: [
      "لنبدأ الاختبار. اقرأ السؤال بهدوء، واستبعد الخيارات غير المنطقية.",
      "بداية موفقة. لا تستعجل، وفكّر في معنى كل خيار قبل الاختيار."
    ],
    quiz_correct: [
      "إجابة صحيحة. أحسنت!",
      "ممتاز، واصل بهذه الطريقة.",
      "بالضبط. تركيزك جيد الآن."
    ],
    quiz_wrong: [
      "ليست الإجابة الصحيحة. اقرأ الشرح بتركيز، فالخطأ فرصة للتعلّم.",
      "لا بأس، هذا خطأ مفيد. افهم سبب الإجابة الصحيحة ثم واصل.",
      "توقّف لحظة: ما الذي جذبك إلى هذا الخيار؟ افهمه حتى لا تكرره."
    ],
    quiz_result_high: [
      "نتيجة ممتازة! أنت تتقن هذا الجزء. حافظ على مراجعة قصيرة ومنتظمة."
    ],
    quiz_result_mid: [
      "نتيجة جيدة. بقيت بعض الفجوات الصغيرة. راجع الأخطاء ثم أعد المحاولة."
    ],
    quiz_result_low: [
      "النتيجة تحتاج تحسينًا. لا تقلق: راجع الدروس المرتبطة، ثم أعد الاختبار بعد قليل."
    ],
    exam_start: [
      "بدأ الامتحان التجريبي. اقرأ التعليمات، ووزّع وقتك، وابدأ بما تعرفه."
    ],
    exam_five_min: [
      "بقيت خمس دقائق. راجع الأسئلة غير المجابة، ولا تترك سؤالًا فارغًا."
    ],
    exam_high: [
      "أداء قوي في الامتحان! أنت قريب من الجاهزية. راجع الفجوات المتبقية."
    ],
    exam_mid: [
      "نتيجة متوسطة. حدّد الفصول الأضعف وراجعها قبل المحاولة القادمة."
    ],
    exam_low: [
      "تحتاج مراجعة أعمق. ابدأ بالأساسيات، ثم أعد الامتحان عندما تشعر بالثقة."
    ],
    mission_done: [
      "مهمة منجزة! هذه مهارة حقيقية ستنفعك في التطبيق العملي.",
      "أحسنت في الطرفية! التمرين العملي يصنع الفرق."
    ],
    flash_milestone: [
      "تقدم رائع في البطاقات! الذاكرة تُبنى بالتكرار المتباعد."
    ],
    motivate: [
      "أنت أقرب مما تظن. خمس عشرة دقيقة اليوم أفضل من ساعتين غدًا.",
      "لا تقارن نفسك بالآخرين. قارن نفسك بنسختك قبل أسبوع.",
      "الخطأ ليس فشلًا، بل معلومة تخبرك أين تركز.",
      "خذ نفسًا عميقًا. ابدأ بأصغر خطوة: درس واحد، أو خمس بطاقات.",
      "الاستمرارية أهم من الشدة. عُد غدًا حتى لو لعشر دقائق.",
      "أنت تبني عادة، وليس مجرد حفظ. كل جلسة تُحدث فرقًا.",
      "تذكّر هدفك: الفهم بالعربية، والنجاح بالفرنسية. أنت على الطريق.",
      "إذا تعبت، توقّف خمس دقائق ثم عُد. لا تستسلم في منتصف الطريق."
    ],
    offline: [
      "أنت تعمل دون اتصال. تقدمك محفوظ على جهازك."
    ],
    error: [
      "حدث خطأ غير متوقع. يمكنك المتابعة، وسيُحفظ تقدمك."
    ],
    reminder: [
      "تذكير لطيف: المراجعة القصيرة المنتظمة أقوى من جلسة طويلة قبل الامتحان."
    ],
    test: [
      "اختبار الصوت: إذا سمعت هذه الجملة بوضوح، فالمرافق الصوتي يعمل. سأكون معك خطوة بخطوة."
    ]
  };

  const supported = !!(window.speechSynthesis && typeof window.SpeechSynthesisUtterance === "function");
  let settings = load();
  let voices = [];
  let speaking = false;
  let activeId = 0;
  let seqId = 0;
  let lastText = "";
  let lastAt = 0;
  let lastPick = {};

  function clamp(n, min, max) {
    return Math.max(min, Math.min(max, n));
  }

  function num(value, fallback, min, max) {
    const n = Number(value);
    return isFinite(n) ? clamp(n, min, max) : fallback;
  }

  function load() {
    let data = {};
    try {
      data = JSON.parse(localStorage.getItem(KEY) || "{}") || {};
    } catch (e) {
      data = {};
    }
    return {
      enabled: data.enabled === true,
      rate: num(data.rate, DEFAULTS.rate, 0.6, 1.4),
      pitch: num(data.pitch, DEFAULTS.pitch, 0.7, 1.3),
      volume: num(data.volume, DEFAULTS.volume, 0, 1),
      voiceURI: typeof data.voiceURI === "string" ? data.voiceURI : "",
      feedbackEach: data.feedbackEach !== false
    };
  }

  function save() {
    try {
      localStorage.setItem(KEY, JSON.stringify(settings));
    } catch (e) {
      /* storage unavailable: voice still works for this session */
    }
  }

  function emit(type, detail) {
    try {
      document.dispatchEvent(new CustomEvent("badrai:voice", {
        detail: Object.assign({ type: type }, detail || {})
      }));
    } catch (e) {
      /* old browser: no custom events */
    }
  }

  function emitSettings() {
    try {
      document.dispatchEvent(new CustomEvent("badrai:voice-settings", {
        detail: { settings: getSettings() }
      }));
    } catch (e) {
      /* ignore */
    }
  }

  function isArabic(voice) {
    const lang = String(voice.lang || "").toLowerCase().replace("_", "-");
    const name = String(voice.name || "").toLowerCase();
    return lang === "ar" || lang.indexOf("ar-") === 0 ||
      name.indexOf("arab") > -1 || name.indexOf("عربي") > -1 || name.indexOf("العربية") > -1;
  }

  function allVoices() {
    if (!supported) return [];
    if (!voices.length) {
      try { voices = window.speechSynthesis.getVoices() || []; } catch (e) { voices = []; }
    }
    return voices;
  }

  function rank(voice) {
    const lang = String(voice.lang || "").toLowerCase().replace("_", "-");
    let score = 0;
    if (voice.localService) score -= 10;
    if (lang === "ar-sa") score -= 5;
    else if (lang === "ar") score -= 4;
    else if (lang.indexOf("ar-") === 0) score -= 3;
    if (voice["default"]) score -= 1;
    return score;
  }

  function arabicVoiceObjects() {
    return allVoices().filter(isArabic).sort(function (a, b) {
      const d = rank(a) - rank(b);
      return d !== 0 ? d : String(a.name).localeCompare(String(b.name));
    });
  }

  function getVoices() {
    return arabicVoiceObjects().map(function (v) {
      return {
        voiceURI: v.voiceURI,
        name: v.name,
        lang: v.lang,
        local: !!v.localService,
        isDefault: !!v["default"]
      };
    });
  }

  function pickVoice() {
    const list = arabicVoiceObjects();
    if (!list.length) return null;
    if (settings.voiceURI) {
      const chosen = list.find(function (v) { return v.voiceURI === settings.voiceURI; });
      if (chosen) return chosen;
    }
    return list[0];
  }

  function voiceInfo() {
    const list = getVoices();
    const chosen = pickVoice();
    return {
      supported: supported,
      total: list.length,
      local: list.filter(function (v) { return v.local; }).length,
      selected: chosen ? { name: chosen.name, lang: chosen.lang, local: !!chosen.localService } : null
    };
  }

  function refreshVoices() {
    if (!supported) return;
    try { voices = window.speechSynthesis.getVoices() || []; } catch (e) { voices = []; }
    emit("voices", voiceInfo());
  }

  function setSpeaking(value) {
    if (speaking === value) return;
    speaking = value;
    document.documentElement.classList.toggle("voice-speaking", value);
    emit(value ? "speaking" : "idle", {});
  }

  function cancelSpeech() {
    seqId += 1;
    activeId += 1;
    if (!supported) return;
    try { window.speechSynthesis.cancel(); } catch (e) { /* ignore */ }
  }

  function speakOne(text, opts, done) {
    if (!supported) {
      if (done) done(false);
      return false;
    }
    let utterance;
    try {
      utterance = new SpeechSynthesisUtterance(text);
    } catch (e) {
      if (done) done(false);
      return false;
    }
    const voice = pickVoice();
    if (voice) {
      try { utterance.voice = voice; } catch (e) { /* some engines reject custom voices */ }
      utterance.lang = voice.lang || "ar-SA";
    } else {
      utterance.lang = "ar-SA";
    }
    utterance.rate = settings.rate;
    utterance.pitch = settings.pitch;
    utterance.volume = settings.volume;

    const id = ++activeId;
    let ended = false;
    let startTimer = null;

    function clearStartTimer() {
      if (startTimer) {
        clearTimeout(startTimer);
        startTimer = null;
      }
    }

    function finish(ok) {
      if (ended) return;
      ended = true;
      clearStartTimer();
      if (done) done(ok);
    }

    utterance.onstart = function () {
      if (id !== activeId) return;
      clearStartTimer();
      setSpeaking(true);
      emit("start", { tag: opts.tag || "", text: String(text).slice(0, 90) });
    };
    utterance.onend = function () {
      clearStartTimer();
      if (id !== activeId) {
        finish(true);
        return;
      }
      if (!opts.sequence) {
        setSpeaking(false);
        emit("end", { tag: opts.tag || "" });
      }
      finish(true);
    };
    utterance.onerror = function (event) {
      clearStartTimer();
      const error = (event && event.error) || "error";
      if (id === activeId) {
        setSpeaking(false);
        if (error !== "interrupted" && error !== "canceled") {
          emit("error", { error: error, tag: opts.tag || "" });
        }
      }
      finish(false);
    };

    startTimer = setTimeout(function () {
      if (id !== activeId || ended) return;
      setSpeaking(false);
      emit("error", { error: "no-start", tag: opts.tag || "" });
      finish(false);
    }, 1600);

    try {
      if (window.speechSynthesis.paused) window.speechSynthesis.resume();
      window.speechSynthesis.speak(utterance);
    } catch (e) {
      setSpeaking(false);
      emit("error", { error: "exception", tag: opts.tag || "" });
      finish(false);
      return false;
    }
    return true;
  }

  function chunkText(text, maxLength) {
    const parts = String(text).replace(/\s+/g, " ").trim().match(/[^.!?؟]+[.!?؟]?/g) || [text];
    const chunks = [];
    let current = "";
    parts.forEach(function (part) {
      part = part.trim();
      if (!part) return;
      if (current && current.length + 1 + part.length > maxLength) {
        chunks.push(current);
        current = part;
      } else {
        current = current ? current + " " + part : part;
      }
    });
    if (current) chunks.push(current);
    const out = [];
    chunks.forEach(function (chunk) {
      while (chunk.length > maxLength) {
        out.push(chunk.slice(0, maxLength));
        chunk = chunk.slice(maxLength);
      }
      if (chunk) out.push(chunk);
    });
    return out.length ? out : [String(text)];
  }

  function speak(text, opts) {
    opts = opts || {};
    if (!supported || !text) return false;
    if (!settings.enabled && !opts.force) return false;
    if (document.hidden && !opts.force) return false;

    const clean = String(text).replace(/\s+/g, " ").trim();
    if (!clean) return false;
    const now = Date.now();
    if (opts.dedupe !== false && clean === lastText && now - lastAt < 1200) return false;
    lastText = clean;
    lastAt = now;

    cancelSpeech();
    return speakOne(clean, opts);
  }

  function speakArabic(text, opts) {
    opts = opts || {};
    if (!supported || !text) return false;
    const clean = String(text).replace(/\s+/g, " ").trim();
    if (!clean) return false;

    cancelSpeech();
    const chunks = chunkText(clean, 170);
    const token = seqId;
    let index = 0;

    function next() {
      if (token !== seqId) return;
      if (index >= chunks.length) {
        setSpeaking(false);
        emit("end", { tag: opts.tag || "" });
        return;
      }
      const chunk = chunks[index++];
      speakOne(chunk, { tag: opts.tag || "", sequence: true }, function (ok) {
        if (token !== seqId) return;
        if (!ok) {
          setSpeaking(false);
          return;
        }
        next();
      });
    }

    next();
    return true;
  }

  function stop() {
    const wasSpeaking = speaking;
    cancelSpeech();
    setSpeaking(false);
    if (wasSpeaking) emit("stop", {});
  }

  function phrase(key) {
    const list = PHRASES[key];
    if (!list || !list.length) return "";
    let index = Math.floor(Math.random() * list.length);
    if (list.length > 1 && index === lastPick[key]) index = (index + 1) % list.length;
    lastPick[key] = index;
    return list[index];
  }

  function say(key, opts) {
    const text = phrase(key);
    if (!text) return false;
    return speak(text, opts);
  }

  function feedback(good) {
    if (!settings.feedbackEach) return false;
    return say(good ? "quiz_correct" : "quiz_wrong");
  }

  function setEnabled(on) {
    on = !!on;
    if (on && !supported) {
      emit("unsupported", {});
      return false;
    }
    if (settings.enabled === on) {
      emitSettings();
      return true;
    }
    settings.enabled = on;
    save();
    emitSettings();
    if (on) {
      say("enabled", { force: true, dedupe: false });
    } else {
      stop();
    }
    return true;
  }

  function setSetting(key, value) {
    if (key === "enabled") return setEnabled(value);
    if (key === "rate") value = num(value, DEFAULTS.rate, 0.6, 1.4);
    else if (key === "pitch") value = num(value, DEFAULTS.pitch, 0.7, 1.3);
    else if (key === "volume") value = num(value, DEFAULTS.volume, 0, 1);
    else if (key === "voiceURI") value = String(value == null ? "" : value);
    else if (key === "feedbackEach") value = !!value;
    else return false;
    settings[key] = value;
    save();
    emitSettings();
    return true;
  }

  function getSettings() {
    return {
      enabled: settings.enabled,
      rate: settings.rate,
      pitch: settings.pitch,
      volume: settings.volume,
      voiceURI: settings.voiceURI,
      feedbackEach: settings.feedbackEach
    };
  }

  function init() {
    if (!supported) {
      emit("unsupported", {});
      return;
    }
    refreshVoices();
    const synth = window.speechSynthesis;
    if (typeof synth.addEventListener === "function") {
      synth.addEventListener("voiceschanged", refreshVoices);
    } else {
      synth.onvoiceschanged = refreshVoices;
    }
    setTimeout(refreshVoices, 250);
    setTimeout(refreshVoices, 1200);
    setTimeout(refreshVoices, 3000);
    window.addEventListener("offline", function () {
      if (settings.enabled) say("offline");
    });
  }

  function test() {
    if (!supported) {
      emit("unsupported", {});
      return false;
    }
    return say("test", { force: true, dedupe: false });
  }

  function motivate() {
    if (!supported) {
      emit("unsupported", {});
      return false;
    }
    return say("motivate", { force: true, dedupe: false });
  }

  function isSpeaking() {
    return speaking;
  }

  function hasArabicVoice() {
    return arabicVoiceObjects().length > 0;
  }

  return {
    init: init,
    isSupported: function () { return supported; },
    hasArabicVoice: hasArabicVoice,
    getVoices: getVoices,
    voiceInfo: voiceInfo,
    getSettings: getSettings,
    setSetting: setSetting,
    setEnabled: setEnabled,
    toggle: function () {
      if (!setEnabled(!settings.enabled)) return settings.enabled;
      return settings.enabled;
    },
    isSpeaking: isSpeaking,
    speak: speak,
    speakArabic: speakArabic,
    say: say,
    feedback: feedback,
    stop: stop,
    test: test,
    motivate: motivate,
    refreshVoices: refreshVoices
  };
})();
