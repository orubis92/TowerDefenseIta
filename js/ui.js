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
      "Servizio completato!",
      `Hai respinto tutte le ${game.waveCount} ondate.\nClienti soddisfatti rimasti: ${game.lives}\nPiatti sgraditi eliminati: ${game.totalKills}`,
      "Rigioca", "🏆"));
    game.on("lost", () => this.showOverlay(
      "La trattoria ha chiuso",
      `I clienti se ne sono andati all'ondata ${game.wave}.\nPiatti sgraditi eliminati: ${game.totalKills}`,
      "Riprova", "😢"));
    this.refresh();
  }

  buildShop() {
    const shop = this.$("shop");
    shop.innerHTML = "";
    this.shopButtons = {};
    for (const [key, def] of Object.entries(TOWERS)) {
      const b = document.createElement("button");
      b.className = "shop-btn";
      const idx = Object.keys(TOWERS).indexOf(key) + 1;
      b.innerHTML = `<span class="key">${idx}</span><div class="emoji">${def.emoji}</div><div class="name">${def.name}</div><div class="cost">💰 ${def.cost}</div><div class="desc">${def.desc}</div>`;
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

  setStat(id, value, anim) {
    const el = this.$(id);
    const old = el.textContent;
    if (old === String(value)) return;
    el.textContent = value;
    if (old === "" || old === "0" && value === CONFIG.startGold) return;
    const box = this.$(id + "-box");
    const cls = (anim === "hurt" && Number(value) < Number(old)) ? "hurt" : "bump";
    box.classList.remove("bump", "hurt");
    void box.offsetWidth; // riavvia l'animazione
    box.classList.add(cls);
  }

  refresh() {
    const g = this.game;
    this.setStat("stat-gold", g.gold, "bump");
    this.setStat("stat-lives", g.lives, "hurt");
    this.setStat("stat-wave", g.wave, "bump");
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
      this.$("sel-level").innerHTML = `Livello ${t.level + 1}/${t.def.levels.length} <span class="stars">${"★".repeat(t.level + 1)}${"☆".repeat(t.def.levels.length - t.level - 1)}</span>`;
      this.$("sel-dmg").textContent = s.dmg + (s.splash ? ` (area ${s.splash})` : "") + (s.slow ? ` + rallenta ${Math.round(s.slow * 100)}%` : "");
      this.$("sel-range").textContent = s.range;
      this.$("sel-rate").textContent = s.rate.toFixed(2) + "/s";
      this.$("sel-kills").textContent = t.kills;
      const up = this.$("btn-upgrade");
      if (t.maxLevel) { up.textContent = "⭐ Livello massimo"; up.disabled = true; }
      else { up.textContent = `⬆️ Potenzia · ${t.upgradeCost}💰`; up.disabled = g.gold < t.upgradeCost; }
      this.$("btn-sell").textContent = `💸 Vendi · +${t.sellValue}`;
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
      .map(([k, n]) => `<span class="wave-chip${ENEMIES[k].boss ? " boss" : ""}" title="${ENEMIES[k].name}"><span class="e">${ENEMIES[k].emoji}</span>×${n}</span>`).join("");
    this.renderWaveBar();
  }

  renderWaveBar() {
    const g = this.game;
    const label = this.$("wave-bar-label"), fill = this.$("wave-bar-fill"), count = this.$("wave-bar-count");
    if (g.state === "wave") {
      const total = g.waveTotal || 1;
      const remaining = g.spawnQueue.length + g.enemies.length;
      const pct = Math.round((1 - remaining / total) * 100);
      label.textContent = `Ondata ${g.wave}`;
      fill.style.width = pct + "%";
      count.innerHTML = `<b>${remaining}</b> in arrivo`;
    } else if (g.state === "won") {
      label.textContent = "Servizio completato"; fill.style.width = "100%"; count.textContent = "";
    } else if (g.state === "lost") {
      label.textContent = "Trattoria chiusa"; fill.style.width = "0%"; count.textContent = "";
    } else {
      label.textContent = g.wave === 0 ? "Pronti al servizio" : `Ondata ${g.wave} respinta`;
      fill.style.width = g.wave === 0 ? "0%" : "100%";
      count.innerHTML = g.wave < g.waveCount ? `prossima: <b>${g.wave + 1}</b>` : "";
    }
  }

  showOverlay(title, text, btnLabel, emoji) {
    this.$("overlay-emoji").textContent = emoji || "🍕";
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
