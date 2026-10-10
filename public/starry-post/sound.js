(function(global) {
  "use strict";
  let ctx = null, master = null, noise = null;
  let lastTick = 0;
  const Sound = {
    enabled: false,
    arm() {
      if (ctx) {
        if (ctx.state === "suspended") ctx.resume();
        return;
      }
      const AC = global.AudioContext || global.webkitAudioContext;
      if (!AC) return;
      ctx = new AC();
      master = ctx.createGain();
      master.gain.value = 0.5;
      master.connect(ctx.destination);
      const len = ctx.sampleRate * 0.6;
      noise = ctx.createBuffer(1, len, ctx.sampleRate);
      const d = noise.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
      document.addEventListener("visibilitychange", () => {
        if (!ctx) return;
        master.gain.setTargetAtTime(document.hidden ? 0 : 0.5, ctx.currentTime, 0.2);
      });
    },
    /* a short band-passed noise burst — a nib catching on paper */
    scratch(dur, freq, q, gain) {
      if (!this.enabled || !ctx) return;
      const src = ctx.createBufferSource();
      src.buffer = noise;
      src.playbackRate.value = 0.7 + Math.random() * 0.6;
      const bp = ctx.createBiquadFilter();
      bp.type = "bandpass";
      bp.frequency.value = freq;
      bp.Q.value = q;
      const g = ctx.createGain();
      const t = ctx.currentTime;
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(gain, t + 4e-3);
      g.gain.exponentialRampToValueAtTime(1e-4, t + dur);
      src.connect(bp);
      bp.connect(g);
      g.connect(master);
      src.start(t);
      src.stop(t + dur + 0.02);
    },
    tone(freq, dur, gain, type) {
      if (!this.enabled || !ctx) return;
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      const t = ctx.currentTime;
      o.type = type || "sine";
      o.frequency.setValueAtTime(freq, t);
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(gain, t + 0.012);
      g.gain.exponentialRampToValueAtTime(1e-4, t + dur);
      o.connect(g);
      g.connect(master);
      o.start(t);
      o.stop(t + dur + 0.02);
    },
    /* one keystroke. rate-limited to ~28/sec so holding a key down doesn't
       turn into a buzzsaw, and randomised so a fast run doesn't sound machined */
    tick() {
      const now = performance.now();
      if (now - lastTick < 34) return;
      lastTick = now;
      this.scratch(0.028 + Math.random() * 0.02, 1900 + Math.random() * 1500, 7, 0.05);
    },
    turn() {
      this.scratch(0.26, 900, 1.2, 0.09);
    },
    stick() {
      this.scratch(0.1, 2600, 3, 0.07);
      this.tone(880, 0.09, 0.03, "triangle");
    },
    /* the seal breaking: a dry crack, then the paper */
    crack() {
      this.scratch(0.07, 520, 2.4, 0.16);
      setTimeout(() => this.scratch(0.3, 1200, 1.1, 0.08), 110);
    },
    /* pressing the wax down: a soft thud with a little ring over it */
    seal() {
      this.tone(128, 0.22, 0.13, "sine");
      this.scratch(0.14, 380, 1.6, 0.1);
      setTimeout(() => this.tone(524, 0.5, 0.035, "triangle"), 120);
      setTimeout(() => this.tone(786, 0.6, 0.022, "triangle"), 190);
    }
  };
  global.Sound = Sound;
})(window);
