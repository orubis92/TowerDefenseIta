/* ==========================================================
   Sprite disegnati a codice (stile cartoon con contorno).
   Ogni sprite è renderizzato una volta su un canvas fuori schermo
   a risoluzione doppia e poi riusato. Spazio logico: 64×64,
   origine al centro (0,0), y verso il basso.
   ========================================================== */
const Sprites = (() => {
  const cache = {}, urls = {};
  const SIZE = 64, SCALE = 2;
  const OUT = "#2b1a14";

  /* --- helper di disegno --- */
  function ell(ctx, x, y, rx, ry, fill, stroke) {
    ctx.beginPath(); ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
    ctx.fillStyle = fill; ctx.fill();
    if (stroke !== false) { ctx.strokeStyle = OUT; ctx.lineWidth = 2; ctx.stroke(); }
  }
  function rrect(ctx, x, y, w, h, r, fill, stroke) {
    ctx.beginPath();
    ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
    ctx.fillStyle = fill; ctx.fill();
    if (stroke !== false) { ctx.strokeStyle = OUT; ctx.lineWidth = 2; ctx.stroke(); }
  }
  function poly(ctx, pts, fill, stroke) {
    ctx.beginPath(); pts.forEach((p, i) => i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])); ctx.closePath();
    ctx.fillStyle = fill; ctx.fill();
    if (stroke !== false) { ctx.strokeStyle = OUT; ctx.lineWidth = 2; ctx.stroke(); }
  }
  function line(ctx, pts, color, w) {
    ctx.beginPath(); pts.forEach((p, i) => i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]));
    ctx.strokeStyle = color || OUT; ctx.lineWidth = w || 2; ctx.lineCap = "round"; ctx.stroke();
  }
  function eyes(ctx, x, y, gap, r, mood) {
    // occhi: mood = "happy" | "angry" | "cool" | "sleepy"
    for (const s of [-1, 1]) {
      const ex = x + s * gap;
      ell(ctx, ex, y, r, r, "#fff");
      ell(ctx, ex + s * r * 0.2, y + r * 0.15, r * 0.5, r * 0.5, OUT, false);
      if (mood === "angry") line(ctx, [[ex - s * r * 1.2, y - r * 0.7], [ex + s * r * 1.0, y - r * 1.6]], OUT, 2.2);
      if (mood === "sleepy") { ctx.fillStyle = "#f0c9a0"; ctx.fillRect(ex - r - 1, y - r - 1, r * 2 + 2, r); line(ctx, [[ex - r, y - r * 0.2], [ex + r, y - r * 0.2]], OUT, 2); }
    }
  }
  function mouth(ctx, x, y, w, kind) {
    ctx.beginPath();
    if (kind === "smile") ctx.arc(x, y, w, 0.15 * Math.PI, 0.85 * Math.PI);
    else if (kind === "frown") ctx.arc(x, y + w, w, 1.15 * Math.PI, 1.85 * Math.PI);
    else if (kind === "grin") { ctx.arc(x, y, w, 0.1 * Math.PI, 0.9 * Math.PI); ctx.closePath(); ctx.fillStyle = "#7a1f1f"; ctx.fill(); }
    else { ctx.moveTo(x - w, y); ctx.lineTo(x + w, y); }
    ctx.strokeStyle = OUT; ctx.lineWidth = 2; ctx.lineCap = "round"; ctx.stroke();
  }
  function moustache(ctx, x, y, w, color) {
    ctx.beginPath();
    ctx.moveTo(x, y); ctx.quadraticCurveTo(x - w * 0.5, y - w * 0.6, x - w, y + w * 0.2);
    ctx.quadraticCurveTo(x - w * 0.5, y + w * 0.35, x, y + w * 0.1);
    ctx.quadraticCurveTo(x + w * 0.5, y + w * 0.35, x + w, y + w * 0.2);
    ctx.quadraticCurveTo(x + w * 0.5, y - w * 0.6, x, y);
    ctx.fillStyle = color || "#5a3a25"; ctx.fill(); ctx.strokeStyle = OUT; ctx.lineWidth = 1.5; ctx.stroke();
  }
  /* corpo "chibi": testa grande, busto piccolo. Ritorna riferimenti utili. */
  function chibi(ctx, o) {
    const skin = o.skin || "#f4c9a1", shirt = o.shirt || "#fff";
    // braccia
    ell(ctx, -17, 8, 5, 5, skin); ell(ctx, 17, 8, 5, 5, skin);
    // busto
    rrect(ctx, -14, -2, 28, 24, 8, shirt);
    if (o.apron) { rrect(ctx, -9, 4, 18, 18, 4, o.apron); line(ctx, [[-9, 4], [-6, -1]], OUT, 1.5); line(ctx, [[9, 4], [6, -1]], OUT, 1.5); }
    // testa
    ell(ctx, 0, -10, 15, 14, skin);
    eyes(ctx, 0, -12, 6, 3, o.mood);
    if (o.cheeks) { ell(ctx, -9, -6, 3, 2, "rgba(255,120,120,.45)", false); ell(ctx, 9, -6, 3, 2, "rgba(255,120,120,.45)", false); }
  }

  /* --- torri --- */
  const draw = {
    pizzaiolo(ctx) {
      chibi(ctx, { shirt: "#fff", apron: "#e8e0d0", mood: "happy", cheeks: true });
      moustache(ctx, 0, -4, 7);
      mouth(ctx, 0, -3, 3, "smile");
      // cappello da cuoco
      rrect(ctx, -12, -24, 24, 6, 2, "#fff");
      ell(ctx, 0, -30, 15, 9, "#fff");
      ell(ctx, -8, -31, 6, 6, "#fff", false); ell(ctx, 8, -31, 6, 6, "#fff", false);
      // pizza in mano
      ell(ctx, 20, 4, 9, 9, "#e6b45a"); ell(ctx, 20, 4, 6.5, 6.5, "#d3442f", false);
      [[17, 2], [23, 3], [20, 7]].forEach(p => ell(ctx, p[0], p[1], 1.8, 1.8, "#f7e9b8", false));
    },
    nonna(ctx) {
      chibi(ctx, { shirt: "#b04a7a", apron: "#f2d7e6", mood: "angry" });
      mouth(ctx, 0, -3, 3, "line");
      // capelli grigi con chignon
      ell(ctx, 0, -18, 15, 8, "#cfcfd6"); ell(ctx, 0, -27, 7, 6, "#cfcfd6");
      // occhiali
      line(ctx, [[-13, -12], [-9, -12]], OUT, 1.5); line(ctx, [[-3, -12], [3, -12]], OUT, 1.5); line(ctx, [[9, -12], [13, -12]], OUT, 1.5);
      ctx.beginPath(); ctx.arc(-6, -12, 4.5, 0, Math.PI * 2); ctx.arc(6, -12, 4.5, 0, Math.PI * 2); ctx.strokeStyle = OUT; ctx.lineWidth = 1.5; ctx.stroke();
      // fiori sul grembiule
      [[-4, 10], [3, 15]].forEach(p => ell(ctx, p[0], p[1], 1.8, 1.8, "#e0492f", false));
      // mattarello
      ctx.save(); ctx.translate(20, 6); ctx.rotate(-0.7);
      rrect(ctx, -3, -14, 6, 28, 3, "#c98b4b"); rrect(ctx, -2, -19, 4, 6, 1.5, "#a86a30"); rrect(ctx, -2, 13, 4, 6, 1.5, "#a86a30");
      ctx.restore();
    },
    gelataio(ctx) {
      chibi(ctx, { shirt: "#fff", apron: "#ffd9e6", mood: "happy", cheeks: true });
      mouth(ctx, 0, -3, 3, "smile");
      // cappello a barchetta a righe
      poly(ctx, [[-13, -22], [13, -22], [10, -30], [-10, -30]], "#fff");
      ctx.fillStyle = "#3b82f6"; ctx.fillRect(-11, -27, 22, 2.5);
      // cono gelato
      ctx.save(); ctx.translate(21, 2);
      poly(ctx, [[-5, 2], [5, 2], [0, 14]], "#e6b45a");
      ell(ctx, 0, -1, 6, 5, "#ff8fb3"); ell(ctx, 0, -7, 5, 4.5, "#8fe0a0"); ell(ctx, 0, -12, 4, 4, "#fff4c2");
      ell(ctx, 1, -15, 1.5, 1.5, "#e0492f", false);
      ctx.restore();
    },
    sommelier(ctx) {
      chibi(ctx, { shirt: "#1f2430", mood: "cool" });
      // camicia e papillon
      poly(ctx, [[-5, -2], [5, -2], [3, 12], [-3, 12]], "#fff");
      poly(ctx, [[-6, 0], [0, 2], [-6, 4]], "#8a1c2b"); poly(ctx, [[6, 0], [0, 2], [6, 4]], "#8a1c2b");
      moustache(ctx, 0, -4, 6, "#2b1a14");
      mouth(ctx, 0, -2, 2, "line");
      // capelli impomatati
      ell(ctx, 0, -20, 14, 6, "#2b1a14"); line(ctx, [[-8, -24], [8, -22]], "#4a3a35", 2);
      // calice
      ctx.save(); ctx.translate(21, 2);
      ell(ctx, 0, -2, 6, 8, "rgba(255,255,255,.55)"); ell(ctx, 0, 1, 5, 4.5, "#8a1c2b", false);
      line(ctx, [[0, 6], [0, 13]], OUT, 2); line(ctx, [[-4, 13], [4, 13]], OUT, 2);
      ctx.restore();
    },
    barista(ctx) {
      chibi(ctx, { shirt: "#3b2a22", apron: "#7a4a2b", mood: "happy" });
      moustache(ctx, 0, -4, 8, "#2b1a14");
      mouth(ctx, 0, -2, 2, "line");
      // capelli e bandana
      ell(ctx, 0, -19, 15, 7, "#2b1a14"); rrect(ctx, -15, -22, 30, 5, 2, "#e0492f");
      // tazzina fumante
      ctx.save(); ctx.translate(21, 4);
      rrect(ctx, -6, -4, 12, 10, 3, "#fff"); ell(ctx, 0, -4, 6, 2.5, "#5a3a25");
      ctx.beginPath(); ctx.arc(7, 1, 3, -Math.PI / 2, Math.PI / 2); ctx.strokeStyle = OUT; ctx.lineWidth = 2; ctx.stroke();
      line(ctx, [[-2, -8], [-1, -12]], "rgba(255,255,255,.7)", 1.5); line(ctx, [[2, -8], [3, -13]], "rgba(255,255,255,.7)", 1.5);
      ctx.restore();
    },
    carabiniere(ctx) {
      chibi(ctx, { shirt: "#1d2a4a", mood: "angry" });
      // bandoliera bianca
      line(ctx, [[-10, -1], [12, 18]], "#fff", 4);
      // bottoni
      [[0, 4], [0, 10], [0, 16]].forEach(p => ell(ctx, p[0], p[1], 1.5, 1.5, "#ffc247", false));
      mouth(ctx, 0, -3, 2, "line");
      moustache(ctx, 0, -5, 5, "#2b1a14");
      // berretto con banda rossa e visiera
      rrect(ctx, -14, -28, 28, 8, 3, "#1d2a4a"); ctx.fillStyle = "#e0492f"; ctx.fillRect(-13, -23, 26, 2.5);
      poly(ctx, [[-15, -20], [15, -20], [16, -16], [-16, -16]], "#101a30");
      ell(ctx, 0, -25, 3, 3, "#ffc247");
      // paletta
      ctx.save(); ctx.translate(21, 0);
      line(ctx, [[0, 4], [0, 16]], OUT, 3); ell(ctx, 0, -2, 7, 7, "#e0492f"); ctx.fillStyle = "#fff"; ctx.fillRect(-4, -3, 8, 2);
      ctx.restore();
    },
    nonno(ctx) {
      chibi(ctx, { shirt: "#6b7d4a", mood: "sleepy" });
      // gilet
      poly(ctx, [[-5, -2], [5, -2], [4, 14], [-4, 14]], "#f4e9d0");
      moustache(ctx, 0, -4, 8, "#e8e8e8");
      mouth(ctx, 0, -1, 2, "line");
      // coppola
      ell(ctx, 0, -21, 15, 6, "#7a5a3a"); poly(ctx, [[-2, -20], [16, -18], [15, -15]], "#6a4a2c");
      // bicchierino con fiamma
      ctx.save(); ctx.translate(21, 4);
      poly(ctx, [[-5, -3], [5, -3], [4, 8], [-4, 8]], "rgba(255,255,255,.6)"); ctx.fillStyle = "#e8b04a"; ctx.fillRect(-3, 2, 6, 5);
      poly(ctx, [[-3, -3], [3, -3], [0, -13]], "#ff7a1f"); poly(ctx, [[-1.5, -3], [1.5, -3], [0, -8]], "#ffe066", false);
      ctx.restore();
    },

    /* --- nemici --- */
    ananas(ctx) {
      // foglie
      [[-8, -18, -14, -32], [0, -18, 0, -34], [8, -18, 14, -32], [-4, -20, -6, -30], [4, -20, 6, -30]]
        .forEach(l => poly(ctx, [[l[0] - 3, l[1]], [l[0] + 3, l[1]], [l[2], l[3]]], "#4c8f3a"));
      ell(ctx, 0, 0, 16, 20, "#f2b134");
      // trama a rombi
      ctx.save(); ctx.beginPath(); ctx.ellipse(0, 0, 15, 19, 0, 0, Math.PI * 2); ctx.clip();
      ctx.strokeStyle = "rgba(120,70,10,.45)"; ctx.lineWidth = 1.5;
      for (let i = -40; i < 40; i += 8) { ctx.beginPath(); ctx.moveTo(i, -30); ctx.lineTo(i + 30, 30); ctx.stroke(); ctx.beginPath(); ctx.moveTo(i, 30); ctx.lineTo(i + 30, -30); ctx.stroke(); }
      ctx.restore();
      eyes(ctx, 0, -3, 6, 3.5, "angry");
      mouth(ctx, 0, 8, 4, "frown");
    },
    ketchup(ctx) {
      rrect(ctx, -11, -12, 22, 34, 7, "#d3232a");
      rrect(ctx, -6, -24, 12, 12, 3, "#f0f0f0"); rrect(ctx, -4, -30, 8, 7, 2, "#f0f0f0");
      rrect(ctx, -9, 0, 18, 14, 3, "#fff8e8");
      ell(ctx, 0, 6, 4, 4, "#e0492f"); poly(ctx, [[-1, 2], [1, 2], [2, 0], [0, 1], [-2, 0]], "#4c8f3a", false);
      eyes(ctx, 0, -8, 4, 2.5, "angry");
      // schizzo
      poly(ctx, [[-2, -34], [2, -34], [4, -38], [-1, -37], [-4, -39]], "#d3232a");
    },
    cappuccino(ctx) {
      // piattino
      ell(ctx, 0, 18, 22, 6, "#f4f4f4");
      // tazza
      poly(ctx, [[-16, -6], [16, -6], [12, 16], [-12, 16]], "#f4f4f4");
      ctx.beginPath(); ctx.arc(18, 3, 6, -Math.PI / 2, Math.PI / 2); ctx.strokeStyle = OUT; ctx.lineWidth = 3; ctx.stroke();
      ctx.beginPath(); ctx.arc(18, 3, 6, -Math.PI / 2, Math.PI / 2); ctx.strokeStyle = "#f4f4f4"; ctx.lineWidth = 1; ctx.stroke();
      // schiuma
      ell(ctx, 0, -7, 15, 6, "#e9d3b5");
      ell(ctx, -4, -9, 4, 2.5, "#8a5a3a", false); ell(ctx, 5, -8, 3, 2, "#8a5a3a", false);
      // faccia assonnata sulla tazza
      eyes(ctx, 0, 3, 5, 3, "sleepy");
      mouth(ctx, 0, 10, 3, "frown");
      // vapore
      line(ctx, [[-6, -16], [-4, -22], [-7, -28]], "rgba(255,255,255,.8)", 2);
      line(ctx, [[4, -16], [6, -22], [3, -28]], "rgba(255,255,255,.8)", 2);
    },
    turista(ctx) {
      // zaino enorme
      rrect(ctx, -22, -14, 22, 32, 7, "#4c8f3a"); rrect(ctx, -20, -20, 18, 10, 4, "#3a7030");
      line(ctx, [[-18, -2], [-4, -2]], OUT, 1.5); line(ctx, [[-18, 6], [-4, 6]], OUT, 1.5);
      chibi(ctx, { shirt: "#ff7a5c", mood: "happy", skin: "#f7d1ad", cheeks: true });
      mouth(ctx, 0, -3, 3, "smile");
      // cappello da sole
      ell(ctx, 0, -20, 20, 5, "#f4e2b0"); rrect(ctx, -11, -30, 22, 11, 4, "#f4e2b0"); ctx.fillStyle = "#e0492f"; ctx.fillRect(-11, -23, 22, 2.5);
      // macchina fotografica
      rrect(ctx, 12, 4, 14, 10, 2, "#333"); ell(ctx, 19, 9, 3.5, 3.5, "#6cc3ff");
      // sandali con calzini
      ell(ctx, -6, 24, 5, 3, "#fff"); ell(ctx, 6, 24, 5, 3, "#fff");
    },
    influencer(ctx) {
      chibi(ctx, { shirt: "#ff7ad9", mood: "cool", skin: "#f7d1ad", cheeks: true });
      mouth(ctx, 0, -3, 3, "smile");
      // occhiali da sole
      rrect(ctx, -13, -15, 11, 7, 3, "#222"); rrect(ctx, 2, -15, 11, 7, 3, "#222"); line(ctx, [[-2, -13], [2, -13]], OUT, 2);
      // capelli lunghi
      ell(ctx, 0, -20, 16, 7, "#ffb347"); ell(ctx, -13, -8, 4, 12, "#ffb347"); ell(ctx, 13, -8, 4, 12, "#ffb347");
      // selfie stick + telefono
      line(ctx, [[18, 10], [26, -22]], "#777", 3);
      rrect(ctx, 20, -34, 12, 18, 2, "#222"); ctx.fillStyle = "#6cc3ff"; ctx.fillRect(22, -32, 8, 13);
      // cuoricini
      ctx.fillStyle = "#ff4d8a"; ctx.font = "9px sans-serif"; ctx.textAlign = "center"; ctx.fillText("♥", -22, -20); ctx.fillText("♥", -26, -10);
    },
    carbonara(ctx) {
      // piatto
      ell(ctx, 0, 6, 28, 16, "#f4f4f4"); ell(ctx, 0, 6, 22, 11, "#e8e8e8", false);
      // spaghetti
      ctx.strokeStyle = "#e8b04a"; ctx.lineWidth = 3; ctx.lineCap = "round";
      for (let i = 0; i < 9; i++) { const a = i * 0.7; ctx.beginPath(); ctx.moveTo(-16 + i * 4, 4 + Math.sin(a) * 4); ctx.quadraticCurveTo(-8 + i * 3, -8 + Math.cos(a) * 5, 2 + i * 2 - 8, 2 + Math.sin(a * 2) * 3); ctx.stroke(); }
      ctx.beginPath(); ctx.ellipse(0, 0, 18, 9, 0, 0, Math.PI * 2); ctx.strokeStyle = OUT; ctx.lineWidth = 1.5; ctx.stroke();
      // panna (l'orrore)
      ell(ctx, 0, -4, 12, 6, "#fffdf5"); ell(ctx, -6, -6, 5, 3.5, "#fffdf5", false); ell(ctx, 6, -6, 5, 3.5, "#fffdf5", false);
      // guanciale
      ell(ctx, -9, 0, 3, 2, "#c96a4a", false); ell(ctx, 8, 2, 3, 2, "#c96a4a", false);
      // faccia malefica
      eyes(ctx, 0, -6, 5, 3, "angry");
      mouth(ctx, 0, 1, 4, "grin");
    },
    ananasgigante(ctx) {
      ctx.save(); ctx.scale(1.15, 1.15);
      draw.ananas(ctx);
      ctx.restore();
      // corona
      poly(ctx, [[-10, -22], [10, -22], [12, -30], [6, -26], [0, -33], [-6, -26], [-12, -30]], "#ffc247");
      [[-6, -25], [0, -27], [6, -25]].forEach(p => ell(ctx, p[0], p[1], 1.5, 1.5, "#e0492f", false));
    },

    /* --- proiettili (piccoli, 24px logici) --- */
    p_pizzaiolo(ctx) { ell(ctx, 0, 0, 10, 10, "#e6b45a"); ell(ctx, 0, 0, 7, 7, "#d3442f", false); [[-3, -2], [3, 1], [0, 4]].forEach(p => ell(ctx, p[0], p[1], 2, 2, "#f7e9b8", false)); },
    p_nonna(ctx) { rrect(ctx, -12, -3, 24, 6, 3, "#c98b4b"); rrect(ctx, -16, -2, 5, 4, 1.5, "#a86a30"); rrect(ctx, 11, -2, 5, 4, 1.5, "#a86a30"); },
    p_gelataio(ctx) { rrect(ctx, -8, -8, 16, 16, 3, "#bfe9ff"); line(ctx, [[-5, 5], [5, -5]], "rgba(255,255,255,.9)", 2); },
    p_sommelier(ctx) { rrect(ctx, -5, -9, 10, 18, 3, "#c9a26b"); line(ctx, [[-3, -4], [3, -4]], "#8a6a3a", 1.5); line(ctx, [[-3, 2], [3, 2]], "#8a6a3a", 1.5); },
    p_barista(ctx) { ell(ctx, 0, 0, 6, 8, "#5a3a25"); line(ctx, [[0, -5], [0, 5]], "#2b1a14", 1.5); },
    p_carabiniere(ctx) { ell(ctx, 0, 0, 9, 9, "#e0492f"); ctx.fillStyle = "#fff"; ctx.fillRect(-5, -1.5, 10, 3); },
    p_nonno(ctx) { poly(ctx, [[-6, -2], [6, -2], [5, 9], [-5, 9]], "rgba(255,255,255,.7)"); ctx.fillStyle = "#e8b04a"; ctx.fillRect(-4, 3, 8, 5); poly(ctx, [[-4, -2], [4, -2], [0, -12]], "#ff7a1f"); },
  };

  function make(key) {
    const c = document.createElement("canvas");
    c.width = SIZE * SCALE; c.height = SIZE * SCALE;
    const ctx = c.getContext("2d");
    ctx.scale(SCALE, SCALE);
    ctx.translate(SIZE / 2, SIZE / 2);
    ctx.lineJoin = "round";
    draw[key](ctx);
    return c;
  }

  return {
    has(key) { return !!draw[key]; },
    get(key) { if (!cache[key]) cache[key] = make(key); return cache[key]; },
    /* disegna centrato in (x,y) con dimensione "size" (lato del quadrato logico 64) */
    draw(ctx, key, x, y, size) {
      const img = this.get(key);
      ctx.drawImage(img, x - size / 2, y - size / 2, size, size);
    },
    dataUrl(key) { if (!urls[key]) urls[key] = this.get(key).toDataURL(); return urls[key]; },
  };
})();
