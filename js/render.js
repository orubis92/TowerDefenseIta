/* ==========================================================
   Rendering su canvas
   ========================================================== */

class Renderer {
  constructor(canvas, game) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    this.game = game;
    this.time = 0;
    this.buildBackground();
    game.on("map-loaded", () => this.buildBackground());
  }

  /* --- utilità --- */
  roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  // pseudo-random deterministico per la texture delle piastrelle
  noise(a, b) { const v = Math.sin(a * 127.1 + b * 311.7) * 43758.5453; return v - Math.floor(v); }

  /* Sfondo statico pre-renderizzato (pavimento, percorso, decorazioni) */
  buildBackground() {
    const g = this.game, c = g.cell, MAP = g.map, P = MAP.palette;
    const bg = document.createElement("canvas");
    bg.width = g.width; bg.height = g.height;
    const ctx = bg.getContext("2d");

    // pavimento: cotto con leggere variazioni di tono
    for (let r = 0; r < CONFIG.rows; r++) {
      for (let col = 0; col < CONFIG.cols; col++) {
        const n = this.noise(col, r);
        const light = (r + col) % 2 === 0 ? 6 : 0;
        const l = 62 + light + n * 6;
        ctx.fillStyle = `hsl(${P.floorHue}, ${P.floorSat}%, ${l - (62 - P.floorLight)}%)`;
        ctx.fillRect(col * c, r * c, c, c);
        // bordo interno chiaro/scuro per dare rilievo
        ctx.fillStyle = "rgba(255,255,255,0.10)";
        ctx.fillRect(col * c + 1, r * c + 1, c - 2, 1);
        ctx.fillRect(col * c + 1, r * c + 1, 1, c - 2);
        ctx.fillStyle = "rgba(60,30,10,0.18)";
        ctx.fillRect(col * c + 1, r * c + c - 2, c - 2, 1);
        ctx.fillRect(col * c + c - 2, r * c + 1, 1, c - 2);
      }
    }
    // fughe
    ctx.strokeStyle = "rgba(70,35,15,0.35)";
    ctx.lineWidth = 2;
    for (let r = 0; r <= CONFIG.rows; r++) { ctx.beginPath(); ctx.moveTo(0, r * c); ctx.lineTo(g.width, r * c); ctx.stroke(); }
    for (let col = 0; col <= CONFIG.cols; col++) { ctx.beginPath(); ctx.moveTo(col * c, 0); ctx.lineTo(col * c, g.height); ctx.stroke(); }

    // percorso: passatoia rossa con bordo morbido e ombra
    const pathPoly = () => {
      ctx.beginPath();
      for (const key of g.pathCells) {
        const [col, r] = key.split(",").map(Number);
        ctx.rect(col * c, r * c, c, c);
      }
    };
    // ombra
    ctx.save();
    ctx.shadowColor = "rgba(0,0,0,0.35)"; ctx.shadowBlur = 14; ctx.shadowOffsetY = 4;
    ctx.fillStyle = P.path;
    pathPoly(); ctx.fill();
    ctx.restore();
    // corpo del tappeto
    ctx.save();
    pathPoly(); ctx.clip();
    ctx.fillStyle = P.path;
    ctx.fillRect(0, 0, g.width, g.height);
    // trama a quadretti soft
    const q = c / 4;
    ctx.fillStyle = "rgba(255,255,255,0.16)";
    for (let y = 0; y < g.height; y += q) for (let x = 0; x < g.width; x += q) {
      if (((x / q) + (y / q)) % 2 === 0) ctx.fillRect(x, y, q, q);
    }
    // linea centrale tratteggiata (guida)
    ctx.setLineDash([10, 12]);
    ctx.strokeStyle = "rgba(255,230,200,0.35)"; ctx.lineWidth = 2;
    ctx.beginPath();
    g.path.forEach((p, i) => i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y));
    ctx.stroke();
    ctx.setLineDash([]);
    // bordo interno chiaro
    ctx.strokeStyle = P.pathLight; ctx.lineWidth = 6;
    pathPoly(); ctx.stroke();
    ctx.restore();
    // bordo esterno scuro
    ctx.save();
    ctx.strokeStyle = P.pathDark; ctx.lineWidth = 3;
    this.strokePathOutline(ctx);
    ctx.restore();

    // celle bloccate (frigo/fornelli): piano in acciaio
    for (const key of g.blockedCells) {
      const [col, r] = key.split(",").map(Number);
      const grad = ctx.createLinearGradient(col * c, r * c, col * c + c, r * c + c);
      grad.addColorStop(0, "#c5ced6"); grad.addColorStop(1, "#8d98a3");
      ctx.fillStyle = grad;
      this.roundRect(ctx, col * c + 3, r * c + 3, c - 6, c - 6, 6); ctx.fill();
      ctx.strokeStyle = "rgba(40,50,60,0.6)"; ctx.lineWidth = 1.5; ctx.stroke();
    }
    ctx.textAlign = "center"; ctx.textBaseline = "middle";
    for (const d of MAP.decorations) {
      ctx.font = `${d.size}px sans-serif`;
      ctx.fillText(d.emoji, d.col * c, d.row * c);
    }

    // porta d'ingresso e sala
    const clampX = x => Math.min(Math.max(x, 24), g.width - 24);
    const clampY = y => Math.min(Math.max(y, 24), g.height - 24);
    const start = g.path[0], end = g.path[g.path.length - 1];
    const sx = clampX(start.x), sy = clampY(start.y), ex = clampX(end.x), ey = clampY(end.y);
    this.label(ctx, "INGRESSO", sx + (start.x < 0 ? 10 : 0), sy - 26 < 8 ? sy + 26 : sy - 26);
    this.label(ctx, "SALA", ex - (end.x > g.width ? 8 : 0), ey - 26);
    ctx.font = "30px sans-serif";
    ctx.fillText("🚪", sx, sy + 2);
    ctx.fillText("🍽️", ex, ey + 2);

    // vignettatura
    const vg = ctx.createRadialGradient(g.width / 2, g.height / 2, g.height * 0.45, g.width / 2, g.height / 2, g.width * 0.75);
    vg.addColorStop(0, "rgba(0,0,0,0)"); vg.addColorStop(1, "rgba(30,10,0,0.35)");
    ctx.fillStyle = vg; ctx.fillRect(0, 0, g.width, g.height);

    this.background = bg;
  }

  label(ctx, text, x, y) {
    ctx.font = "bold 10px Nunito, sans-serif";
    const w = ctx.measureText(text).width + 14;
    ctx.fillStyle = "rgba(30,12,6,0.75)";
    this.roundRect(ctx, x - w / 2, y - 9, w, 18, 9); ctx.fill();
    ctx.fillStyle = "#ffd27a";
    ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.fillText(text, x, y + 0.5);
  }

  strokePathOutline(ctx) {
    const g = this.game, c = g.cell;
    ctx.beginPath();
    for (const key of g.pathCells) {
      const [col, r] = key.split(",").map(Number);
      const x = col * c, y = r * c;
      const open = (cc, rr) => g.map.waypoints.some(([wc, wr]) => wc === cc && wr === rr); // waypoint fuori schermo = varco
      if (!g.isPath(col, r - 1) && !(r === 0 && open(col, -1))) { ctx.moveTo(x, y); ctx.lineTo(x + c, y); }
      if (!g.isPath(col + 1, r) && !(col === CONFIG.cols - 1 && open(CONFIG.cols, r))) { ctx.moveTo(x + c, y); ctx.lineTo(x + c, y + c); }
      if (!g.isPath(col, r + 1) && !(r === CONFIG.rows - 1 && open(col, CONFIG.rows))) { ctx.moveTo(x, y + c); ctx.lineTo(x + c, y + c); }
      if (!g.isPath(col - 1, r) && !(col === 0 && open(-1, r))) { ctx.moveTo(x, y); ctx.lineTo(x, y + c); }
    }
    ctx.stroke();
  }

  draw(dt) {
    this.time += dt;
    const ctx = this.ctx, g = this.game, c = g.cell;
    ctx.save();
    if (g.shake > 0) {
      const k = g.shake * 10;
      ctx.translate((Math.random() - 0.5) * k, (Math.random() - 0.5) * k);
    }
    ctx.drawImage(this.background, 0, 0);
    ctx.textAlign = "center"; ctx.textBaseline = "middle";

    // pozze di fuoco (sotto a tutto)
    for (const fx of g.effects) {
      if (fx.kind !== "fire") continue;
      const k = fx.life / fx.maxLife;
      const flicker = 0.9 + Math.sin(this.time * 18 + fx.seed) * 0.1;
      const rg = ctx.createRadialGradient(fx.x, fx.y, 2, fx.x, fx.y, fx.radius * flicker);
      rg.addColorStop(0, `rgba(255,230,120,${0.85 * Math.min(1, k * 2)})`);
      rg.addColorStop(0.5, `rgba(255,120,40,${0.6 * Math.min(1, k * 2)})`);
      rg.addColorStop(1, "rgba(255,60,20,0)");
      ctx.fillStyle = rg;
      ctx.beginPath(); ctx.arc(fx.x, fx.y, fx.radius * flicker, 0, Math.PI * 2); ctx.fill();
      // fiammelle
      for (let i = 0; i < 5; i++) {
        const a = fx.seed + i * 1.3 + this.time * 2, rr = fx.radius * 0.5;
        const fxp = fx.x + Math.cos(a) * rr, fyp = fx.y + Math.sin(a) * rr - Math.abs(Math.sin(this.time * 9 + i)) * 8;
        ctx.font = "12px sans-serif"; ctx.globalAlpha = Math.min(1, k * 2) * 0.9;
        ctx.fillText("🔥", fxp, fyp);
        ctx.globalAlpha = 1;
      }
    }

    // mira abilità
    if (g.aiming && g.hoverPos) {
      const def = ABILITIES[g.aiming];
      const rg = ctx.createRadialGradient(g.hoverPos.x, g.hoverPos.y, 0, g.hoverPos.x, g.hoverPos.y, def.radius);
      rg.addColorStop(0, "rgba(255,140,40,0.15)"); rg.addColorStop(1, "rgba(255,140,40,0.4)");
      ctx.fillStyle = rg;
      ctx.beginPath(); ctx.arc(g.hoverPos.x, g.hoverPos.y, def.radius, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = "rgba(255,200,80,0.95)"; ctx.lineWidth = 2; ctx.setLineDash([6, 6]); ctx.stroke(); ctx.setLineDash([]);
      ctx.font = "26px sans-serif"; ctx.fillText(def.emoji, g.hoverPos.x, g.hoverPos.y);
    }

    // hover su cella edificabile (anche senza torre selezionata)
    if (g.hoverCell && !g.placing && !g.aiming && g.canBuild(g.hoverCell.col, g.hoverCell.row)) {
      ctx.fillStyle = "rgba(255,255,255,0.10)";
      this.roundRect(ctx, g.hoverCell.col * c + 3, g.hoverCell.row * c + 3, c - 6, c - 6, 8); ctx.fill();
    }

    // anteprima piazzamento
    if (g.placing && g.hoverCell) {
      const { col, row } = g.hoverCell;
      const ok = g.canBuild(col, row);
      const def = TOWERS[g.placing];
      const x = (col + 0.5) * c, y = (row + 0.5) * c;
      const rgb = ok ? "126,211,107" : "224,74,58";
      const rg = ctx.createRadialGradient(x, y, 0, x, y, def.levels[0].range);
      rg.addColorStop(0, `rgba(${rgb},0.05)`); rg.addColorStop(1, `rgba(${rgb},0.28)`);
      ctx.fillStyle = rg;
      ctx.beginPath(); ctx.arc(x, y, def.levels[0].range, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = `rgba(${rgb},0.9)`; ctx.lineWidth = 2; ctx.setLineDash([6, 6]); ctx.stroke(); ctx.setLineDash([]);
      ctx.fillStyle = `rgba(${rgb},0.45)`;
      this.roundRect(ctx, col * c + 3, row * c + 3, c - 6, c - 6, 8); ctx.fill();
      ctx.globalAlpha = 0.8;
      Sprites.draw(ctx, g.placing, x, y - 4, c * 1.25);
      ctx.globalAlpha = 1;
    }

    // raggio della torre selezionata
    if (g.selectedTower) {
      const t = g.selectedTower;
      const pulse = 1 + Math.sin(this.time * 4) * 0.01;
      const rg = ctx.createRadialGradient(t.x, t.y, 0, t.x, t.y, t.stats.range * pulse);
      rg.addColorStop(0, "rgba(255,194,71,0.04)"); rg.addColorStop(1, "rgba(255,194,71,0.22)");
      ctx.fillStyle = rg;
      ctx.beginPath(); ctx.arc(t.x, t.y, t.stats.range * pulse, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = "rgba(255,194,71,0.95)"; ctx.lineWidth = 2; ctx.stroke();
    }

    // torri
    for (const t of g.towers) this.drawTower(t, t === g.selectedTower);

    // nemici (ordinati per progresso, così i primi sono sopra)
    const enemies = [...g.enemies].sort((a, b) => a.progress - b.progress);
    for (const e of enemies) this.drawEnemy(e);

    // proiettili
    for (const p of g.projectiles) {
      ctx.save();
      ctx.translate(p.x, p.y);
      // scia
      const ang = Math.atan2(p.lastY - p.y, p.lastX - p.x);
      const tg = ctx.createLinearGradient(-Math.cos(ang) * 18, -Math.sin(ang) * 18, 0, 0);
      tg.addColorStop(0, "rgba(255,220,150,0)"); tg.addColorStop(1, "rgba(255,220,150,0.6)");
      ctx.strokeStyle = tg; ctx.lineWidth = 4; ctx.lineCap = "round";
      ctx.beginPath(); ctx.moveTo(-Math.cos(ang) * 18, -Math.sin(ang) * 18); ctx.lineTo(0, 0); ctx.stroke();
      const pk = "p_" + p.tower.type;
      if (Sprites.has(pk)) {
        if (p.tower.type === "sommelier" || p.tower.type === "nonna" || p.tower.type === "barista") ctx.rotate(ang + Math.PI / 2); else ctx.rotate(p.spin);
        Sprites.draw(ctx, pk, 0, 0, 26);
      } else {
        ctx.rotate(p.spin); ctx.font = "16px sans-serif"; ctx.fillText(p.emoji, 0, 0);
      }
      ctx.restore();
    }

    // effetti
    for (const fx of g.effects) {
      const k = fx.life / fx.maxLife;
      if (fx.kind === "ring") {
        ctx.strokeStyle = `rgba(255,220,120,${k})`;
        ctx.lineWidth = 3;
        ctx.beginPath(); ctx.arc(fx.x, fx.y, fx.radius * (1.2 - k * 0.4), 0, Math.PI * 2); ctx.stroke();
      } else if (fx.kind === "pop") {
        ctx.fillStyle = `rgba(255,255,255,${k * 0.7})`;
        ctx.beginPath(); ctx.arc(fx.x, fx.y, fx.radius * (1.5 - k), 0, Math.PI * 2); ctx.fill();
      } else if (fx.kind === "particle") {
        ctx.globalAlpha = Math.min(1, k * 1.5);
        ctx.fillStyle = fx.color;
        ctx.beginPath(); ctx.arc(fx.x, fx.y, fx.radius, 0, Math.PI * 2); ctx.fill();
        ctx.globalAlpha = 1;
      } else if (fx.kind === "stun") {
        ctx.globalAlpha = k;
        ctx.font = "16px sans-serif";
        ctx.fillText("💫", fx.x, fx.y - fx.radius * (1.6 - k));
        ctx.globalAlpha = 1;
      } else if (fx.kind === "blink") {
        ctx.globalAlpha = k * 0.8;
        ctx.strokeStyle = fx.color; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.arc(fx.x, fx.y, fx.radius * (1.6 - k), 0, Math.PI * 2); ctx.stroke();
        ctx.globalAlpha = 1;
      } else if (fx.kind === "shout") {
        ctx.globalAlpha = k * 0.35;
        ctx.fillStyle = fx.color === "#fff" ? "#ff5a3c" : fx.color;
        ctx.fillRect(0, 0, g.width, g.height);
        ctx.globalAlpha = 1;
      }
    }

    // testi fluttuanti
    for (const t of g.texts) {
      ctx.globalAlpha = Math.min(1, t.life / t.maxLife * 2);
      ctx.font = "800 14px Nunito, sans-serif";
      ctx.lineWidth = 4; ctx.strokeStyle = "rgba(20,8,4,0.7)"; ctx.lineJoin = "round";
      ctx.strokeText(t.text, t.x, t.y);
      ctx.fillStyle = t.color;
      ctx.fillText(t.text, t.x, t.y);
      ctx.globalAlpha = 1;
    }

    // pausa
    if (g.paused) {
      ctx.fillStyle = "rgba(10,4,2,0.45)";
      ctx.fillRect(0, 0, g.width, g.height);
      ctx.fillStyle = "#ffd27a";
      ctx.font = "600 40px Fredoka, sans-serif";
      ctx.fillText("⏸  PAUSA", g.width / 2, g.height / 2);
    }
    ctx.restore();
  }

  drawTower(t, selected) {
    const ctx = this.ctx, c = this.game.cell;
    if (this.game.rateMult > 1) {
      const rg = ctx.createRadialGradient(t.x, t.y, c * 0.3, t.x, t.y, c * 0.6);
      rg.addColorStop(0, "rgba(255,194,71,0.45)"); rg.addColorStop(1, "rgba(255,194,71,0)");
      ctx.fillStyle = rg; ctx.beginPath(); ctx.arc(t.x, t.y, c * 0.6, 0, Math.PI * 2); ctx.fill();
    }
    // ombra
    ctx.fillStyle = "rgba(0,0,0,0.28)";
    ctx.beginPath(); ctx.ellipse(t.x, t.y + c * 0.36, c * 0.36, c * 0.14, 0, 0, Math.PI * 2); ctx.fill();
    // base: piatto con bordo
    const grad = ctx.createRadialGradient(t.x - 6, t.y - 8, 4, t.x, t.y, c * 0.42);
    grad.addColorStop(0, "#fff8ec"); grad.addColorStop(1, "#e2cdb0");
    ctx.fillStyle = "#8a2a1f";
    ctx.beginPath(); ctx.arc(t.x, t.y + 2, c * 0.42, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = grad;
    ctx.beginPath(); ctx.arc(t.x, t.y, c * 0.39, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = selected ? "#ffc247" : "rgba(138,42,31,0.6)"; ctx.lineWidth = selected ? 3 : 1.5; ctx.stroke();
    // sprite con leggero rinculo verso il bersaglio; guarda a destra o a sinistra
    const k = t.recoil > 0 ? t.recoil / 0.15 : 0;
    const ox = -Math.cos(t.angle) * 4 * k, oy = -Math.sin(t.angle) * 4 * k;
    const flip = Math.cos(t.angle) < -0.2;
    ctx.save();
    ctx.translate(t.x + ox, t.y + oy - 5);
    if (flip) ctx.scale(-1, 1);
    Sprites.draw(ctx, t.type, 0, 0, c * 1.3);
    ctx.restore();
    // livello: pallini dorati
    if (t.level > 0) {
      for (let i = 0; i < t.level; i++) {
        const px = t.x - (t.level - 1) * 5 + i * 10, py = t.y + c * 0.38;
        ctx.fillStyle = "#ffc247";
        ctx.beginPath(); ctx.arc(px, py, 3.5, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = "#7d2216"; ctx.lineWidth = 1; ctx.stroke();
      }
    }
  }

  drawEnemy(e) {
    const ctx = this.ctx;
    const bob = Math.sin(e.wobble) * 2;
    const tilt = Math.sin(e.wobble * 0.5) * 0.12;
    // ombra
    ctx.fillStyle = "rgba(0,0,0,0.28)";
    ctx.beginPath(); ctx.ellipse(e.x, e.y + e.size * 0.5, e.size * 0.45, e.size * 0.16, 0, 0, Math.PI * 2); ctx.fill();
    // aura boss
    if (e.def.boss) {
      const rg = ctx.createRadialGradient(e.x, e.y, e.size * 0.3, e.x, e.y, e.size * 1.1);
      rg.addColorStop(0, "rgba(255,90,60,0.35)"); rg.addColorStop(1, "rgba(255,90,60,0)");
      ctx.fillStyle = rg; ctx.beginPath(); ctx.arc(e.x, e.y, e.size * 1.1, 0, Math.PI * 2); ctx.fill();
    }
    // corpo
    ctx.save();
    ctx.translate(e.x, e.y + bob); ctx.rotate(tilt);
    // guarda nella direzione di marcia
    const nxt = e.path[Math.min(e.wpIndex, e.path.length - 1)];
    if (nxt && nxt.x < e.x - 1) ctx.scale(-1, 1);
    if (e.hitFlash > 0) ctx.filter = "brightness(1.9) saturate(0.4)";
    Sprites.draw(ctx, e.type, 0, 0, e.size * 2.1);
    ctx.restore();
    if (e.slowFactor < 1) {
      ctx.font = "12px sans-serif";
      ctx.fillText("❄️", e.x + e.size * 0.45, e.y - e.size * 0.45 + bob);
    }
    if (e.stunned) {
      ctx.font = "13px sans-serif";
      ctx.fillText("💫", e.x - e.size * 0.45, e.y - e.size * 0.5 + Math.sin(this.time * 6) * 2);
    }
    // barra HP arrotondata
    const w = Math.max(24, e.size * 1.25), h = 5;
    const x = e.x - w / 2, y = e.y - e.size * 1.15 + bob;
    ctx.fillStyle = "rgba(20,8,4,0.6)";
    this.roundRect(ctx, x - 1, y - 1, w + 2, h + 2, 3); ctx.fill();
    const pct = Math.max(0, e.hp / e.maxHp);
    ctx.fillStyle = pct > 0.5 ? "#7ed36b" : pct > 0.25 ? "#ffc247" : "#ff5a3c";
    if (pct > 0) { this.roundRect(ctx, x, y, w * pct, h, 2.5); ctx.fill(); }
  }
}
