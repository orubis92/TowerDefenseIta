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
  }

  /* Sfondo statico pre-renderizzato (pavimento, percorso, decorazioni) */
  buildBackground() {
    const g = this.game, c = g.cell;
    const bg = document.createElement("canvas");
    bg.width = g.width; bg.height = g.height;
    const ctx = bg.getContext("2d");

    // pavimento a scacchi
    for (let r = 0; r < CONFIG.rows; r++) {
      for (let col = 0; col < CONFIG.cols; col++) {
        ctx.fillStyle = (r + col) % 2 === 0 ? "#e7d3b4" : "#d9c2a3";
        ctx.fillRect(col * c, r * c, c, c);
      }
    }
    // linee fughe
    ctx.strokeStyle = "rgba(90,60,40,0.12)";
    ctx.lineWidth = 1;
    for (let r = 0; r <= CONFIG.rows; r++) { ctx.beginPath(); ctx.moveTo(0, r * c); ctx.lineTo(g.width, r * c); ctx.stroke(); }
    for (let col = 0; col <= CONFIG.cols; col++) { ctx.beginPath(); ctx.moveTo(col * c, 0); ctx.lineTo(col * c, g.height); ctx.stroke(); }

    // percorso: tovaglia a quadretti rossa
    for (const key of g.pathCells) {
      const [col, r] = key.split(",").map(Number);
      ctx.fillStyle = "#c94a3b";
      ctx.fillRect(col * c, r * c, c, c);
      ctx.fillStyle = "#e8746a";
      const q = c / 4;
      for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) {
        if ((i + j) % 2 === 0) ctx.fillRect(col * c + i * q, r * c + j * q, q, q);
      }
      ctx.fillStyle = "rgba(255,255,255,0.35)";
      for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) {
        if ((i + j) % 2 === 1) ctx.fillRect(col * c + i * q, r * c + j * q, q, q);
      }
    }
    // bordo del percorso
    ctx.strokeStyle = "#8a2a1f";
    ctx.lineWidth = 2;
    for (const key of g.pathCells) {
      const [col, r] = key.split(",").map(Number);
      const nb = [[0, -1], [1, 0], [0, 1], [-1, 0]];
      nb.forEach(([dc, dr], i) => {
        const nc = col + dc, nr = r + dr;
        const outside = nc < 0 || nc >= CONFIG.cols || nr < 0 || nr >= CONFIG.rows;
        if (outside || g.isPath(nc, nr)) return;
        ctx.beginPath();
        const x = col * c, y = r * c;
        if (i === 0) { ctx.moveTo(x, y); ctx.lineTo(x + c, y); }
        if (i === 1) { ctx.moveTo(x + c, y); ctx.lineTo(x + c, y + c); }
        if (i === 2) { ctx.moveTo(x, y + c); ctx.lineTo(x + c, y + c); }
        if (i === 3) { ctx.moveTo(x, y); ctx.lineTo(x, y + c); }
        ctx.stroke();
      });
    }

    // celle bloccate (frigo/fornelli)
    for (const key of g.blockedCells) {
      const [col, r] = key.split(",").map(Number);
      ctx.fillStyle = "#9aa4ad";
      ctx.fillRect(col * c + 2, r * c + 2, c - 4, c - 4);
      ctx.strokeStyle = "#5f6b75";
      ctx.strokeRect(col * c + 2, r * c + 2, c - 4, c - 4);
    }
    ctx.textAlign = "center"; ctx.textBaseline = "middle";
    for (const d of MAP.decorations) {
      ctx.font = `${d.size}px sans-serif`;
      ctx.fillText(d.emoji, d.col * c, d.row * c);
    }

    // porta d'ingresso e tavolo d'uscita
    const start = g.path[0], end = g.path[g.path.length - 1];
    ctx.font = "30px sans-serif";
    ctx.fillText("🚪", Math.max(start.x, 22), start.y);
    ctx.fillText("🍽️", Math.min(end.x, g.width - 22), end.y);
    ctx.font = "bold 11px sans-serif";
    ctx.fillStyle = "#4a2418";
    ctx.fillText("INGRESSO", Math.max(start.x, 34), start.y - 22);
    ctx.fillText("SALA", Math.min(end.x, g.width - 22), end.y - 22);

    this.background = bg;
  }

  draw(dt) {
    this.time += dt;
    const ctx = this.ctx, g = this.game, c = g.cell;
    ctx.drawImage(this.background, 0, 0);
    ctx.textAlign = "center"; ctx.textBaseline = "middle";

    // anteprima piazzamento
    if (g.placing && g.hoverCell) {
      const { col, row } = g.hoverCell;
      const ok = g.canBuild(col, row);
      const def = TOWERS[g.placing];
      const x = (col + 0.5) * c, y = (row + 0.5) * c;
      ctx.fillStyle = ok ? "rgba(111,174,75,0.25)" : "rgba(200,50,40,0.3)";
      ctx.beginPath(); ctx.arc(x, y, def.levels[0].range, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = ok ? "rgba(111,174,75,0.8)" : "rgba(200,50,40,0.8)";
      ctx.lineWidth = 2; ctx.stroke();
      ctx.fillStyle = ok ? "rgba(111,174,75,0.5)" : "rgba(200,50,40,0.5)";
      ctx.fillRect(col * c, row * c, c, c);
      ctx.globalAlpha = 0.7;
      ctx.font = "28px sans-serif";
      ctx.fillText(def.emoji, x, y);
      ctx.globalAlpha = 1;
    }

    // raggio della torre selezionata
    if (g.selectedTower) {
      const t = g.selectedTower;
      ctx.fillStyle = "rgba(242,177,52,0.15)";
      ctx.beginPath(); ctx.arc(t.x, t.y, t.stats.range, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = "rgba(242,177,52,0.9)"; ctx.lineWidth = 2; ctx.stroke();
      ctx.strokeStyle = "#f2b134"; ctx.lineWidth = 3;
      ctx.strokeRect(t.col * c + 2, t.row * c + 2, c - 4, c - 4);
    }

    // torri
    for (const t of g.towers) this.drawTower(t);

    // nemici (ordinati per progresso, così i primi sono sopra)
    const enemies = [...g.enemies].sort((a, b) => a.progress - b.progress);
    for (const e of enemies) this.drawEnemy(e);

    // proiettili
    for (const p of g.projectiles) {
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.spin);
      ctx.font = "16px sans-serif";
      ctx.fillText(p.emoji, 0, 0);
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
        ctx.fillStyle = `rgba(255,255,255,${k * 0.8})`;
        ctx.beginPath(); ctx.arc(fx.x, fx.y, fx.radius * (1.5 - k), 0, Math.PI * 2); ctx.fill();
      }
    }

    // testi fluttuanti
    for (const t of g.texts) {
      ctx.globalAlpha = Math.min(1, t.life / t.maxLife * 2);
      ctx.font = "bold 14px sans-serif";
      ctx.lineWidth = 3; ctx.strokeStyle = "rgba(0,0,0,0.6)";
      ctx.strokeText(t.text, t.x, t.y);
      ctx.fillStyle = t.color;
      ctx.fillText(t.text, t.x, t.y);
      ctx.globalAlpha = 1;
    }

    // pausa
    if (g.paused) {
      ctx.fillStyle = "rgba(0,0,0,0.35)";
      ctx.fillRect(0, 0, g.width, g.height);
      ctx.fillStyle = "#fff";
      ctx.font = "bold 36px sans-serif";
      ctx.fillText("⏸ PAUSA", g.width / 2, g.height / 2);
    }
  }

  drawTower(t) {
    const ctx = this.ctx, c = this.game.cell;
    // base
    ctx.fillStyle = "#6b4a3a";
    ctx.beginPath(); ctx.arc(t.x, t.y + 2, c * 0.42, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#f6e9d8";
    ctx.beginPath(); ctx.arc(t.x, t.y, c * 0.38, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = "#8a2a1f"; ctx.lineWidth = 2; ctx.stroke();
    // emoji con leggero rinculo verso il bersaglio
    const k = t.recoil > 0 ? t.recoil / 0.15 : 0;
    const ox = -Math.cos(t.angle) * 4 * k, oy = -Math.sin(t.angle) * 4 * k;
    ctx.font = "26px sans-serif";
    ctx.fillText(t.def.emoji, t.x + ox, t.y + oy + 1);
    // stelle di livello
    if (t.level > 0) {
      ctx.font = "10px sans-serif";
      ctx.fillText("⭐".repeat(t.level), t.x, t.y + c * 0.36);
    }
  }

  drawEnemy(e) {
    const ctx = this.ctx;
    const bob = Math.sin(e.wobble) * 2;
    // ombra
    ctx.fillStyle = "rgba(0,0,0,0.25)";
    ctx.beginPath(); ctx.ellipse(e.x, e.y + e.size * 0.5, e.size * 0.45, e.size * 0.18, 0, 0, Math.PI * 2); ctx.fill();
    // corpo
    ctx.font = `${e.size}px sans-serif`;
    if (e.hitFlash > 0) {
      ctx.save(); ctx.filter = "brightness(1.8)";
      ctx.fillText(e.def.emoji, e.x, e.y + bob);
      ctx.restore();
    } else {
      ctx.fillText(e.def.emoji, e.x, e.y + bob);
    }
    if (e.slowFactor < 1) {
      ctx.font = "11px sans-serif";
      ctx.fillText("❄️", e.x + e.size * 0.45, e.y - e.size * 0.45 + bob);
    }
    // barra HP
    const w = Math.max(22, e.size * 1.2), h = 4;
    const x = e.x - w / 2, y = e.y - e.size * 0.75 + bob;
    ctx.fillStyle = "rgba(0,0,0,0.5)";
    ctx.fillRect(x - 1, y - 1, w + 2, h + 2);
    const pct = Math.max(0, e.hp / e.maxHp);
    ctx.fillStyle = pct > 0.5 ? "#6fae4b" : pct > 0.25 ? "#f2b134" : "#e0492f";
    ctx.fillRect(x, y, w * pct, h);
  }
}
