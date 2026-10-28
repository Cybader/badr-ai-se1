/* =========================================================
   Badr AI — Sound engine (Web Audio, aucun fichier externe)
   ========================================================= */
(function () {
  "use strict";

  const KEY = "badrai.se1.sound";
  let ctx = null;
  let master = null;
  let muted = (localStorage.getItem(KEY) || "1") === "0";

  function ensure() {
    if (!ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      ctx = new AC();
      master = ctx.createGain();
      master.gain.value = muted ? 0 : 0.2;
      master.connect(ctx.destination);
    }
    if (ctx.state === "suspended") ctx.resume().catch(() => {});
    return ctx;
  }

  function setMaster() {
    if (master && ctx) {
      master.gain.cancelScheduledValues(ctx.currentTime);
      master.gain.linearRampToValueAtTime(muted ? 0 : 0.2, ctx.currentTime + 0.05);
    }
  }

  function tone(freq, dur, type, vol, delay, glideTo) {
    const c = ensure();
    if (!c || muted) return;
    const t0 = c.currentTime + (delay || 0);
    const osc = c.createOscillator();
    const g = c.createGain();
    osc.type = type || "sine";
    osc.frequency.setValueAtTime(freq, t0);
    if (glideTo) osc.frequency.exponentialRampToValueAtTime(glideTo, t0 + dur);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(vol || 0.3, t0 + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(g);
    g.connect(master);
    osc.start(t0);
    osc.stop(t0 + dur + 0.03);
  }

  function noise(dur, vol, delay, freq, type) {
    const c = ensure();
    if (!c || muted) return;
    const t0 = c.currentTime + (delay || 0);
    const len = Math.max(1, Math.floor(c.sampleRate * dur));
    const buf = c.createBuffer(1, len, c.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = c.createBufferSource();
    src.buffer = buf;
    const filter = c.createBiquadFilter();
    filter.type = type || "lowpass";
    filter.frequency.value = freq || 900;
    const g = c.createGain();
    g.gain.setValueAtTime(vol || 0.15, t0);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    src.connect(filter);
    filter.connect(g);
    g.connect(master);
    src.start(t0);
    src.stop(t0 + dur + 0.02);
  }

  const sounds = {
    click() {
      tone(620, 0.05, "square", 0.16);
      tone(880, 0.04, "sine", 0.08, 0.02);
    },
    hover() {
      tone(420, 0.035, "sine", 0.06);
    },
    pop() {
      tone(760, 0.06, "sine", 0.16);
      tone(1140, 0.07, "sine", 0.09, 0.03);
    },
    success() {
      [523.25, 659.25, 783.99].forEach((f, i) => tone(f, 0.2, "sine", 0.22, i * 0.085));
    },
    error() {
      tone(196, 0.18, "sawtooth", 0.16);
      tone(155, 0.22, "square", 0.1, 0.03);
    },
    type() {
      noise(0.025, 0.05, 0, 2200, "highpass");
    },
    bell() {
      tone(987.77, 0.5, "sine", 0.2);
      tone(1318.5, 0.4, "sine", 0.1, 0.04);
    },
    fanfare() {
      [523.25, 659.25, 783.99, 1046.5, 1318.5].forEach((f, i) =>
        tone(f, 0.32, "triangle", 0.18, i * 0.09)
      );
      noise(0.5, 0.05, 0.1, 2400, "highpass");
    },
    whoosh() {
      noise(0.32, 0.1, 0, 500, "highpass");
      tone(220, 0.3, "sine", 0.06, 0, 90);
    },
    page() {
      noise(0.12, 0.06, 0, 1200, "bandpass");
    },
    toggleOn() {
      tone(600, 0.08, "sine", 0.14);
      tone(900, 0.1, "sine", 0.1, 0.07);
    },
    toggleOff() {
      tone(500, 0.08, "sine", 0.12);
      tone(300, 0.1, "sine", 0.09, 0.06);
    }
  };

  function play(name) {
    if (muted) return;
    ensure();
    const fn = sounds[name];
    if (fn) fn();
  }

  function setMuted(value) {
    muted = !!value;
    localStorage.setItem(KEY, muted ? "0" : "1");
    setMaster();
    document.documentElement.classList.toggle("is-muted", muted);
    if (!muted) play("toggleOn");
    else sounds.toggleOff && (function () {
      // éviter le son coupé : jouer avant mutation déjà faite -> on force un mini bip
      try {
        ensure();
        if (ctx && master) {
          master.gain.setValueAtTime(0.2, ctx.currentTime);
          tone(500, 0.07, "sine", 0.1);
          tone(320, 0.09, "sine", 0.08, 0.05);
          master.gain.setTargetAtTime(0, ctx.currentTime + 0.12, 0.02);
        }
      } catch (e) {}
    })();
  }

  function toggle() {
    setMuted(!muted);
    return muted;
  }

  // Déverrouillage au premier geste utilisateur
  function unlock() {
    ensure();
    window.removeEventListener("pointerdown", unlock);
    window.removeEventListener("keydown", unlock);
  }
  window.addEventListener("pointerdown", unlock, { once: true, passive: true });
  window.addEventListener("keydown", unlock, { once: true });

  document.documentElement.classList.toggle("is-muted", muted);

  window.SFX = { play, toggle, setMuted, unlock, get muted() { return muted; } };
})();
