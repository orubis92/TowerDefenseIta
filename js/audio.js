/* ==========================================================
   Audio sintetizzato con Web Audio API: nessun file esterno,
   funziona offline. Effetti brevi + musichetta di sottofondo.
   ========================================================== */
class AudioFX {
  constructor() {
    this.ctx = null;
    this.enabled = this.loadPref("sfx", true);
    this.musicOn = this.loadPref("music", true);
    this.master = null;
    this.musicGain = null;
    this.musicTimer = null;
    this.step = 0;
  }

  loadPref(k, def) { try { const v = localStorage.getItem("trattoria-" + k); return v === null ? def : v === "1"; } catch (e) { return def; } }
  savePref(k, v) { try { localStorage.setItem("trattoria-" + k, v ? "1" : "0"); } catch (e) { /* ignora */ } }

  /* il contesto audio si può creare solo dopo un gesto dell'utente */
  init() {
    if (this.ctx) { if (this.ctx.state === "suspended") this.ctx.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    this.ctx = new AC();
    this.master = this.ctx.createGain();
    this.master.gain.value = 0.5;
    this.master.connect(this.ctx.destination);
    this.musicGain = this.ctx.createGain();
    this.musicGain.gain.value = this.musicOn ? 0.18 : 0;
    this.musicGain.connect(this.master);
    this.startMusic();
  }

  toggleSfx() { this.enabled = !this.enabled; this.savePref("sfx", this.enabled); return this.enabled; }
  toggleMusic() {
    this.musicOn = !this.musicOn; this.savePref("music", this.musicOn);
    if (this.musicGain) this.musicGain.gain.setTargetAtTime(this.musicOn ? 0.18 : 0, this.ctx.currentTime, 0.05);
    return this.musicOn;
  }

  /* --- primitive --- */
  tone(freq, dur, type, vol, opts) {
    if (!this.ctx || !this.enabled) return;
    opts = opts || {};
    const t = this.ctx.currentTime + (opts.delay || 0);
    const o = this.ctx.createOscillator(), g = this.ctx.createGain();
    o.type = type || "sine";
    o.frequency.setValueAtTime(freq, t);
    if (opts.slide) o.frequency.exponentialRampToValueAtTime(Math.max(20, opts.slide), t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol || 0.2, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(this.master);
    o.start(t); o.stop(t + dur + 0.02);
  }

  noise(dur, vol, opts) {
    if (!this.ctx || !this.enabled) return;
    opts = opts || {};
    const t = this.ctx.currentTime + (opts.delay || 0);
    const n = Math.floor(this.ctx.sampleRate * dur);
    const buf = this.ctx.createBuffer(1, n, this.ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n);
    const src = this.ctx.createBufferSource(); src.buffer = buf;
    const f = this.ctx.createBiquadFilter(); f.type = opts.type || "lowpass"; f.frequency.value = opts.freq || 1200;
    const g = this.ctx.createGain(); g.gain.value = vol || 0.2;
    src.connect(f); f.connect(g); g.connect(this.master);
    src.start(t);
  }

  /* --- effetti di gioco --- */
  shoot(kind) {
    switch (kind) {
      case "barista": this.tone(900, 0.05, "square", 0.05, { slide: 500 }); break;
      case "sommelier": this.noise(0.08, 0.25, { freq: 2500, type: "bandpass" }); this.tone(220, 0.12, "triangle", 0.15, { slide: 80 }); break;
      case "nonna": this.tone(160, 0.12, "sawtooth", 0.12, { slide: 60 }); break;
      case "gelataio": this.tone(1200, 0.08, "sine", 0.08, { slide: 1800 }); break;
      case "carabiniere": this.tone(700, 0.1, "square", 0.08); this.tone(900, 0.1, "square", 0.08, { delay: 0.1 }); break;
      case "nonno": this.noise(0.15, 0.15, { freq: 900 }); break;
      default: this.tone(520, 0.07, "triangle", 0.1, { slide: 380 });
    }
  }
  hit() { this.tone(300, 0.04, "square", 0.04, { slide: 200 }); }
  kill(boss) {
    if (boss) { this.noise(0.5, 0.4, { freq: 600 }); [330, 415, 494, 659].forEach((f, i) => this.tone(f, 0.25, "triangle", 0.2, { delay: i * 0.1 })); }
    else { this.tone(660, 0.08, "sine", 0.12); this.tone(990, 0.1, "sine", 0.1, { delay: 0.06 }); }
  }
  coin() { this.tone(1320, 0.06, "sine", 0.08); this.tone(1760, 0.1, "sine", 0.08, { delay: 0.05 }); }
  build() { this.tone(200, 0.08, "square", 0.12, { slide: 400 }); this.noise(0.08, 0.1, { freq: 800 }); }
  upgrade() { [523, 659, 784].forEach((f, i) => this.tone(f, 0.12, "triangle", 0.15, { delay: i * 0.07 })); }
  sell() { this.tone(500, 0.1, "triangle", 0.12, { slide: 250 }); }
  error() { this.tone(180, 0.15, "sawtooth", 0.12, { slide: 120 }); }
  lifeLost() { this.tone(240, 0.2, "sawtooth", 0.18, { slide: 90 }); this.noise(0.15, 0.15, { freq: 500 }); }
  waveStart() { [392, 523, 659].forEach((f, i) => this.tone(f, 0.15, "square", 0.1, { delay: i * 0.1 })); }
  waveEnd() { [523, 659, 784, 1047].forEach((f, i) => this.tone(f, 0.18, "triangle", 0.14, { delay: i * 0.09 })); }
  ability(key) {
    if (key === "mammamia") { this.tone(400, 0.5, "sawtooth", 0.25, { slide: 900 }); this.noise(0.4, 0.3, { freq: 1500 }); }
    else if (key === "espresso") { [660, 880, 1100, 1320].forEach((f, i) => this.tone(f, 0.08, "square", 0.1, { delay: i * 0.05 })); }
    else { this.noise(0.4, 0.35, { freq: 700 }); this.tone(120, 0.3, "sawtooth", 0.2, { slide: 40 }); }
  }
  win() { [523, 659, 784, 1047, 784, 1047, 1319].forEach((f, i) => this.tone(f, 0.22, "triangle", 0.18, { delay: i * 0.13 })); }
  lose() { [440, 415, 392, 370, 349].forEach((f, i) => this.tone(f, 0.35, "sawtooth", 0.15, { delay: i * 0.22 })); }
  click() { this.tone(800, 0.03, "square", 0.04); }

  /* --- musichetta: tarantella minimale in loop --- */
  startMusic() {
    if (!this.ctx || this.musicTimer) return;
    const bpm = 150, beat = 60 / bpm;
    // melodia (semicrome in 6/8) in La minore, note in Hz; 0 = pausa
    const A = 440, B = 494, C = 523, D = 587, E = 659, F = 698, G = 784, A2 = 880;
    const melody = [A, C, E, A2, E, C, A, C, E, G, E, C, D, F, A2, F, D, B, E, G, B * 2 / 2, G, E, B,
                    A, C, E, A2, E, C, A, C, E, G, E, C, D, F, A2, F, D, B, C, E, A2, E, C, A];
    const bass = [A / 2, 0, 0, E / 2, 0, 0, A / 2, 0, 0, E / 2, 0, 0, D / 2, 0, 0, A / 2, 0, 0, E / 2, 0, 0, E / 2, 0, 0,
                  A / 2, 0, 0, E / 2, 0, 0, A / 2, 0, 0, E / 2, 0, 0, D / 2, 0, 0, A / 2, 0, 0, E / 2, 0, 0, A / 2, 0, 0];
    const stepDur = beat / 2;
    const schedule = () => {
      const t = this.ctx.currentTime;
      for (let i = 0; i < 6; i++) {
        const idx = (this.step + i) % melody.length;
        const at = t + i * stepDur;
        this.note(melody[idx], stepDur * 0.9, "triangle", 0.5, at);
        if (bass[idx]) this.note(bass[idx], stepDur * 1.8, "sine", 0.7, at);
        if (idx % 3 === 0) this.tick(at, idx % 6 === 0 ? 0.5 : 0.25);
      }
      this.step += 6;
    };
    schedule();
    this.musicTimer = setInterval(schedule, stepDur * 6 * 1000 - 20);
  }

  note(freq, dur, type, vol, at) {
    if (!freq) return;
    const o = this.ctx.createOscillator(), g = this.ctx.createGain();
    o.type = type; o.frequency.value = freq;
    g.gain.setValueAtTime(0.0001, at);
    g.gain.exponentialRampToValueAtTime(vol, at + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, at + dur);
    o.connect(g); g.connect(this.musicGain);
    o.start(at); o.stop(at + dur + 0.02);
  }

  tick(at, vol) {
    const n = Math.floor(this.ctx.sampleRate * 0.03);
    const buf = this.ctx.createBuffer(1, n, this.ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n);
    const src = this.ctx.createBufferSource(); src.buffer = buf;
    const g = this.ctx.createGain(); g.gain.value = vol * 0.4;
    src.connect(g); g.connect(this.musicGain);
    src.start(at);
  }
}
