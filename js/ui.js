/* ==========================================================
   Interfaccia HTML (negozio, pannello selezione, overlay, toast)
   ========================================================== */

class UI {
  constructor(game, canvas) {
    this.game = game;
    this.canvas = canvas;
    this.$ = id => document.getElementById(id);
    this.buildShop();
    this.bind();
    game.on("change", () => this.refresh());
    game.on("toast", msg => this.toast(msg));
    game.on("wave-start", () => this.refresh());
    game.on("wave-end", () => this.refresh());
    game.on("won", () => this.showOverlay(
      "Servizio completato! 🎉",
      `Hai respinto tutte le ${game.waveCount} ondate.\nClienti soddisfatti rimasti: ${game.lives}\nPiatti sgraditi eliminati: ${game.totalKills}`,
      "Rigioca"));
    game.on("lost", () => this.showOverlay(
      "La trattoria ha chiuso 😢",
      `I clienti se ne sono andati all'ondata ${game.wave}.\nPiatti sgraditi eliminati: ${game.totalKills}`,
      "Riprova"));
    this.refresh();
  }

  buildShop() {
    const shop = this.$("shop");
    shop.innerHTML = "";
    this.shopButtons = {};
    for (const [key, def] of Object.entries(TOWERS)) {
      const b = document.createElement("button");
      b.className = "shop-btn";
      b.innerHTML = `<div class="emoji">${def.emoji}</div><div class="name">${def.name}</div><div class="cost">💰 ${def.cost}</div><div class="desc">${def.desc}</div>`;
      b.addEventListener("click", () => this.game.selectShop(key));
      shop.appendChild(b);
      this.shopButtons[key] = b;
    }
  }

  bind() {
    const g = this.game;
    this.$("btn-wave").addEventListener("click", () => { g.startWave(); this.refresh(); });
    this.$("btn-speed").addEventListener("click", () => g.toggleSpeed());
    this.$("btn-pause").addEventListener("click", () => g.togglePause());
    this.$("btn-upgrade").addEventListener("click", () => g.upgradeSelected());
    this.$("btn-sell").addEventListener("click", () => g.sellSelected());
    this.$("overlay-btn").addEventListener("click", () => {
      this.hideOverlay();
      if (g.state === "won" || g.state === "lost") { g.reset(); this.refresh(); }
    });

    // input sul canvas
    const toCell = ev => {
      const rect = this.canvas.getBoundingClientRect();
      const sx = this.canvas.width / rect.width, sy = this.canvas.height / rect.height;
      const x = (ev.clientX - rect.left) * sx, y = (ev.clientY - rect.top) * sy;
      return { col: Math.floor(x / g.cell), row: Math.floor(y / g.cell) };
    };
    this.canvas.addEventListener("pointermove", ev => { g.hoverCell = toCell(ev); });
    this.canvas.addEventListener("pointerleave", () => { g.hoverCell = null; });
    this.canvas.addEventListener("pointerdown", ev => {
      ev.preventDefault();
      const cell = toCell(ev);
      g.hoverCell = cell;
      g.clickCell(cell.col, cell.row);
    });
    this.canvas.addEventListener("contextmenu", ev => { ev.preventDefault(); g.placing = null; g.selectedTower = null; this.refresh(); });

    // tastiera
    window.addEventListener("keydown", ev => {
      if (ev.key === "Escape") { g.placing = null; g.selectedTower = null; this.refresh(); }
      if (ev.key === " ") { ev.preventDefault(); if (g.canStartWave) g.startWave(); else g.togglePause(); this.refresh(); }
      const keys = Object.keys(TOWERS);
      const n = parseInt(ev.key, 10);
      if (n >= 1 && n <= keys.length) g.selectShop(keys[n - 1]);
    });
  }

  refresh() {
    const g = this.game;
    this.$("stat-gold").textContent = g.gold;
    this.$("stat-lives").textContent = g.lives;
    this.$("stat-wave").textContent = g.wave;
    this.$("stat-wave-max").textContent = g.waveCount;
    this.$("btn-speed").textContent = `⏩ ${g.speed}×`;
    this.$("btn-pause").textContent = g.paused ? "▶️" : "⏸";

    for (const [key, b] of Object.entries(this.shopButtons)) {
      b.classList.toggle("selected", g.placing === key);
      b.disabled = g.gold < TOWERS[key].cost && g.placing !== key;
    }
    this.$("shop-hint").textContent = g.placing
      ? `Tocca una piastrella libera per piazzare ${TOWERS[g.placing].name}. (Esc per annullare)`
      : "Scegli un cuoco, poi tocca una piastrella libera per piazzarlo.";

    // selezione
    const t = g.selectedTower;
    this.$("selection-empty").classList.toggle("hidden", !!t);
    this.$("selection-info").classList.toggle("hidden", !t);
    if (t) {
      const s = t.stats;
      this.$("sel-emoji").textContent = t.def.emoji;
      this.$("sel-name").textContent = t.def.name;
      this.$("sel-level").textContent = `Livello ${t.level + 1}/${t.def.levels.length}`;
      this.$("sel-dmg").textContent = s.dmg + (s.splash ? ` (area ${s.splash})` : "") + (s.slow ? ` + rallenta ${Math.round(s.slow * 100)}%` : "");
      this.$("sel-range").textContent = s.range;
      this.$("sel-rate").textContent = s.rate.toFixed(2);
      this.$("sel-kills").textContent = t.kills;
      const up = this.$("btn-upgrade");
      if (t.maxLevel) { up.textContent = "⭐ Livello massimo"; up.disabled = true; }
      else { up.textContent = `⬆️ Potenzia (💰 ${t.upgradeCost})`; up.disabled = g.gold < t.upgradeCost; }
      this.$("btn-sell").textContent = `💸 Vendi (+${t.sellValue})`;
    }

    // ondata
    const btn = this.$("btn-wave");
    btn.disabled = !g.canStartWave;
    if (g.state === "wave") btn.textContent = `⏳ Ondata ${g.wave} in corso…`;
    else if (g.wave >= g.waveCount) btn.textContent = "🏁 Servizio finito";
    else btn.textContent = g.wave === 0 ? "▶️ Fai entrare i clienti" : `▶️ Ondata ${g.wave + 1}`;
    this.renderWavePreview();
  }

  renderWavePreview() {
    const g = this.game;
    const box = this.$("wave-preview");
    const idx = g.state === "wave" ? g.wave - 1 : g.wave;
    if (idx >= WAVES.length) { box.innerHTML = `<span class="hint">Nessun altro cliente in arrivo.</span>`; return; }
    const counts = {};
    for (const grp of WAVES[idx].groups) counts[grp.type] = (counts[grp.type] || 0) + grp.count;
    const label = g.state === "wave" ? "In sala:" : "Prossimi:";
    box.innerHTML = `<span class="hint" style="margin:0">${label}</span>` + Object.entries(counts)
      .map(([k, n]) => `<span class="wave-chip" title="${ENEMIES[k].name}">${ENEMIES[k].emoji} ×${n}</span>`).join("");
  }

  showOverlay(title, text, btnLabel) {
    this.$("overlay-title").textContent = title;
    this.$("overlay-text").textContent = text;
    this.$("overlay-btn").textContent = btnLabel;
    this.$("overlay").classList.remove("hidden");
  }
  hideOverlay() { this.$("overlay").classList.add("hidden"); }

  toast(msg) {
    const el = this.$("toast");
    el.textContent = msg;
    el.classList.remove("hidden");
    el.style.opacity = "1";
    clearTimeout(this._toastTimer);
    this._toastTimer = setTimeout(() => { el.style.opacity = "0"; setTimeout(() => el.classList.add("hidden"), 300); }, 1600);
  }
}
