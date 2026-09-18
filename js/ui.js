/* ==========================================================
   Interfaccia HTML: menu livelli, negozio, abilità, pannelli,
   overlay di fine partita, toast
   ========================================================== */

class UI {
  constructor(game, canvas) {
    this.game = game;
    this.canvas = canvas;
    this.$ = id => document.getElementById(id);
    this.buildShop();
    this.buildAbilities();
    this.bind();
    game.on("change", () => this.refresh());
    game.on("toast", msg => this.toast(msg));
    game.on("wave-start", () => this.refresh());
    game.on("wave-end", () => this.refresh());
    game.on("won", r => this.showResult(true, r));
    game.on("lost", r => this.showResult(false, r));

    // audio
    this.audio = new AudioFX();
    const unlock = () => { this.audio.init(); };
    window.addEventListener("pointerdown", unlock);
    window.addEventListener("keydown", unlock);
    this._shootThrottle = {};
    game.on("shoot", type => {
      const now = performance.now();
      if (this._shootThrottle[type] && now - this._shootThrottle[type] < 90) return;
      this._shootThrottle[type] = now;
      this.audio.shoot(type);
    });
    game.on("kill", boss => this.audio.kill(boss));
    game.on("sfx", k => this.audio[k] && this.audio[k]());
    game.on("wave-start", () => this.audio.waveStart());
    game.on("wave-end", () => this.audio.waveEnd());
    game.on("won", () => this.audio.win());
    game.on("lost", () => this.audio.lose());
    game.on("ability", k => this.audio.ability(k));
    this.showMenu();
  }

  /* ---------- menu livelli ---------- */
  showMenu() {
    this.$("menu").classList.remove("hidden");
    this.$("main").classList.add("hidden");
    this.$("btn-menu").classList.add("hidden");
    document.querySelector(".stats").classList.add("hidden");
    document.querySelector(".controls").classList.add("hidden");
    this.renderLevelGrid();
  }

  renderLevelGrid() {
    const grid = this.$("level-grid");
    grid.innerHTML = "";
    MAP_ORDER.forEach((key, i) => {
      const m = MAPS[key], s = SaveData.forMap(key);
      const card = document.createElement("button");
      card.className = "level-card";
      card.style.setProperty("--hue", m.palette.floorHue);
      card.innerHTML = `
        <div class="level-num">Locale ${i + 1}</div>
        <div class="level-emoji">${m.emoji}</div>
        <div class="level-name">${m.name}</div>
        <div class="level-sub">${m.subtitle}</div>
        <div class="level-stars">${"★".repeat(s.stars)}${"☆".repeat(3 - s.stars)}</div>
        <div class="level-meta">
          <span title="Difficoltà">🌶️ ${"●".repeat(Math.round(m.difficulty * 2) - 1)}</span>
          <span title="Miglior ondata">🌊 ${s.bestWave || "–"}</span>
          <span title="Miglior punteggio">🏅 ${s.bestScore || "–"}</span>
        </div>`;
      card.addEventListener("click", () => this.startLevel(key));
      grid.appendChild(card);
    });
  }

  startLevel(key) {
    this.game.loadMap(key);
    this.$("menu").classList.add("hidden");
    this.$("main").classList.remove("hidden");
    this.$("btn-menu").classList.remove("hidden");
    document.querySelector(".stats").classList.remove("hidden");
    document.querySelector(".controls").classList.remove("hidden");
    this.hideOverlay();
    this.refresh();
    this.toast(`${MAPS[key].emoji} ${MAPS[key].name} — buon servizio!`);
  }

  /* ---------- negozio ---------- */
  buildShop() {
    const shop = this.$("shop");
    shop.innerHTML = "";
    this.shopButtons = {};
    Object.entries(TOWERS).forEach(([key, def], i) => {
      const b = document.createElement("button");
      b.className = "shop-btn";
      b.innerHTML = `<span class="key">${i + 1}</span><div class="emoji"><img src="${Sprites.dataUrl(key)}" alt=""></div><div class="name">${def.name}</div><div class="cost">💰 ${def.cost}</div><div class="desc">${def.desc}</div>`;
      b.addEventListener("click", () => this.game.selectShop(key));
      shop.appendChild(b);
      this.shopButtons[key] = b;
    });
  }

  /* ---------- abilità ---------- */
  buildAbilities() {
    const box = this.$("abilities");
    box.innerHTML = "";
    this.abilityButtons = {};
    for (const [key, def] of Object.entries(ABILITIES)) {
      const b = document.createElement("button");
      b.className = "ability";
      b.title = `${def.name} — ${def.desc}`;
      b.innerHTML = `<span class="ab-key">${def.key}</span><span class="ab-emoji">${def.emoji}</span><span class="ab-name">${def.name}</span><span class="ab-cd"></span><span class="ab-mask"></span>`;
      b.addEventListener("click", () => this.game.useAbility(key));
      box.appendChild(b);
      this.abilityButtons[key] = b;
    }
  }

  refreshAbilities() {
    const g = this.game;
    for (const [key, b] of Object.entries(this.abilityButtons)) {
      const st = g.abilities[key], def = ABILITIES[key];
      const ready = st.cooldown <= 0 && g.state === "wave";
      b.classList.toggle("ready", ready);
      b.classList.toggle("aiming", g.aiming === key);
      b.classList.toggle("active", st.active > 0);
      b.disabled = !ready;
      b.querySelector(".ab-cd").textContent = st.cooldown > 0 ? Math.ceil(st.cooldown) + "s" : (g.state === "wave" ? "" : "—");
      b.querySelector(".ab-mask").style.height = (st.cooldown / def.cooldown * 100) + "%";
    }
  }

  /* ---------- eventi ---------- */
  bind() {
    const g = this.game;
    this.$("btn-wave").addEventListener("click", () => { g.startWave(); this.refresh(); });
    this.$("btn-speed").addEventListener("click", () => g.toggleSpeed());
    this.$("btn-pause").addEventListener("click", () => g.togglePause());
    this.$("btn-auto").addEventListener("click", () => { g.toggleAutoWave(); this.toast(g.autoWave ? "Ondate automatiche: attive" : "Ondate automatiche: disattivate"); });
    this.$("btn-sfx").addEventListener("click", () => { this.audio.toggleSfx(); this.refreshToggles(); });
    this.$("btn-music").addEventListener("click", () => { this.audio.toggleMusic(); this.refreshToggles(); });
    this.$("btn-menu").addEventListener("click", () => {
      if (g.state === "wave" && !confirm("Abbandonare la partita in corso?")) return;
      this.showMenu();
    });
    this.$("rotate-hint-close").addEventListener("click", () => { this.$("rotate-hint").classList.add("hidden"); try { localStorage.setItem("trattoria-rotate-hint", "1"); } catch (e) { /* ignora */ } });
    try { if (localStorage.getItem("trattoria-rotate-hint")) this.$("rotate-hint").classList.add("hidden"); } catch (e) { /* ignora */ }
    this.$("btn-upgrade").addEventListener("click", () => g.upgradeSelected());
    this.$("btn-sell").addEventListener("click", () => g.sellSelected());
    this.$("overlay-btn").addEventListener("click", () => this.overlayAction && this.overlayAction());
    this.$("overlay-btn2").addEventListener("click", () => this.overlayAction2 && this.overlayAction2());

    // input sul canvas
    const toPos = ev => {
      const rect = this.canvas.getBoundingClientRect();
      const sx = this.canvas.width / rect.width, sy = this.canvas.height / rect.height;
      return { x: (ev.clientX - rect.left) * sx, y: (ev.clientY - rect.top) * sy };
    };
    const setHover = ev => {
      const p = toPos(ev);
      g.hoverPos = p;
      g.hoverCell = { col: Math.floor(p.x / g.cell), row: Math.floor(p.y / g.cell) };
    };
    this.canvas.addEventListener("pointermove", setHover);
    this.canvas.addEventListener("pointerleave", ev => { if (ev.pointerType === "touch") return; g.hoverCell = null; g.hoverPos = null; });
    this.canvas.addEventListener("pointerdown", ev => {
      ev.preventDefault();
      const p = toPos(ev);
      const cell = { col: Math.floor(p.x / g.cell), row: Math.floor(p.y / g.cell) };
      // su touch: primo tocco = anteprima (raggio + validità), secondo tocco sulla stessa cella = conferma
      if (ev.pointerType === "touch" && (g.placing || g.aiming)) {
        const same = g.hoverCell && g.hoverCell.col === cell.col && g.hoverCell.row === cell.row;
        setHover(ev);
        if (!same) { this.refresh(); return; }
      } else {
        setHover(ev);
      }
      g.clickAt(p.x, p.y);
      if (ev.pointerType === "touch") { g.hoverCell = null; g.hoverPos = null; }
    });
    this.canvas.addEventListener("contextmenu", ev => { ev.preventDefault(); g.cancel(); });

    // tastiera
    window.addEventListener("keydown", ev => {
      if (this.$("main").classList.contains("hidden")) return;
      if (ev.key === "Escape") { g.cancel(); }
      if (ev.key === " ") { ev.preventDefault(); if (g.canStartWave) g.startWave(); else g.togglePause(); this.refresh(); }
      const keys = Object.keys(TOWERS);
      const n = parseInt(ev.key, 10);
      if (n >= 1 && n <= keys.length) g.selectShop(keys[n - 1]);
      const ab = Object.entries(ABILITIES).find(([, d]) => d.key.toLowerCase() === ev.key.toLowerCase());
      if (ab) g.useAbility(ab[0]);
    });
  }

  /* ---------- aggiornamento pannelli ---------- */
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

  refreshToggles() {
    const a = this.audio;
    this.$("btn-sfx").textContent = a.enabled ? "🔊" : "🔇";
    this.$("btn-sfx").classList.toggle("off", !a.enabled);
    this.$("btn-music").textContent = a.musicOn ? "🎵" : "🎵";
    this.$("btn-music").classList.toggle("off", !a.musicOn);
  }

  refresh() {
    const g = this.game;
    this.refreshToggles();
    this.$("btn-auto").classList.toggle("on", g.autoWave);
    this.setStat("stat-gold", g.gold, "bump");
    this.setStat("stat-lives", g.lives, "hurt");
    this.setStat("stat-wave", g.wave, "bump");
    this.$("stat-score").textContent = g.score;
    this.$("stat-wave-max").textContent = g.waveCount;
    this.$("stat-wave-max-wrap").classList.toggle("hidden", g.endless);
    this.$("stat-wave-box").classList.toggle("endless", g.endless);
    this.$("btn-speed").textContent = `⏩ ${g.speed}×`;
    this.$("btn-pause").textContent = g.paused ? "▶️" : "⏸";

    for (const [key, b] of Object.entries(this.shopButtons)) {
      b.classList.toggle("selected", g.placing === key);
      b.disabled = g.gold < TOWERS[key].cost && g.placing !== key;
    }
    const touch = window.matchMedia("(pointer: coarse)").matches;
    this.$("shop-hint").textContent = g.aiming
      ? (touch ? `Tocca un punto per l'anteprima, poi di nuovo per usare ${ABILITIES[g.aiming].name}.` : `Tocca un punto della mappa per usare ${ABILITIES[g.aiming].name}. (Esc per annullare)`)
      : g.placing
        ? (touch ? `Tocca una piastrella per l'anteprima, poi di nuovo per piazzare ${TOWERS[g.placing].name}.` : `Tocca una piastrella libera per piazzare ${TOWERS[g.placing].name}. (Esc per annullare)`)
        : "Scegli un cuoco, poi tocca una piastrella libera per piazzarlo.";

    // selezione
    const t = g.selectedTower;
    this.$("selection-empty").classList.toggle("hidden", !!t);
    this.$("selection-info").classList.toggle("hidden", !t);
    if (t) {
      const s = t.stats;
      this.$("sel-emoji").innerHTML = `<img src="${Sprites.dataUrl(t.type)}" alt="">`;
      this.$("sel-name").textContent = t.def.name;
      this.$("sel-level").innerHTML = `Livello ${t.level + 1}/${t.def.levels.length} <span class="stars">${"★".repeat(t.level + 1)}${"☆".repeat(t.def.levels.length - t.level - 1)}</span>`;
      let extra = "";
      if (s.splash) extra += ` · area ${s.splash}`;
      if (s.slow) extra += ` · rallenta ${Math.round(s.slow * 100)}%`;
      if (s.stun) extra += ` · ferma ${s.stun}s`;
      if (s.burnDps) extra += ` · fuoco ${s.burnDps}/s`;
      this.$("sel-dmg").textContent = s.dmg + extra;
      this.$("sel-range").textContent = s.range;
      this.$("sel-rate").textContent = s.rate.toFixed(1) + "/s";
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
    else if (g.state === "won" || g.state === "lost") btn.textContent = "🏁 Servizio finito";
    else if (g.autoWave && g.wave > 0 && g.autoTimer > 0) btn.textContent = `⏱ Ondata ${g.wave + 1} tra ${Math.ceil(g.autoTimer)}s`;
    else if (g.endless) btn.textContent = `♾️ Ondata ${g.wave + 1}`;
    else btn.textContent = g.wave === 0 ? "▶️ Fai entrare i clienti" : `▶️ Ondata ${g.wave + 1}`;
    this.renderWavePreview();
    this.refreshAbilities();
  }

  renderWavePreview() {
    const g = this.game;
    const box = this.$("wave-preview");
    const n = g.state === "wave" ? g.wave : g.wave + 1;
    if (!g.endless && n > CONFIG.storyWaves) { box.innerHTML = `<span class="hint" style="margin:0">Servizio completato.</span>`; this.renderWaveBar(); return; }
    const def = g.waveDef(n);
    const counts = {};
    for (const grp of def.groups) { const ty = grp.type === "boss" ? g.map.boss : grp.type; counts[ty] = (counts[ty] || 0) + grp.count; }
    const label = g.state === "wave" ? "In sala:" : "Prossimi:";
    box.innerHTML = `<span class="hint" style="margin:0">${label}</span>` + Object.entries(counts)
      .map(([k, c]) => `<span class="wave-chip${ENEMIES[k].boss ? " boss" : ""}" title="${ENEMIES[k].name}"><img class="e" src="${Sprites.dataUrl(k)}" alt="">×${c}</span>`).join("");
    this.renderWaveBar();
  }

  renderWaveBar() {
    const g = this.game;
    const label = this.$("wave-bar-label"), fill = this.$("wave-bar-fill"), count = this.$("wave-bar-count");
    if (g.state === "wave") {
      const total = g.waveTotal || 1;
      const remaining = g.spawnQueue.length + g.enemies.length;
      const pct = Math.round((1 - Math.min(remaining, total) / total) * 100);
      label.textContent = (g.endless ? "♾️ " : "") + `Ondata ${g.wave}`;
      fill.style.width = pct + "%";
      count.innerHTML = `<b>${remaining}</b> in arrivo`;
    } else if (g.state === "won") {
      label.textContent = "Servizio completato"; fill.style.width = "100%"; count.textContent = "";
    } else if (g.state === "lost") {
      label.textContent = "Trattoria chiusa"; fill.style.width = "0%"; count.textContent = "";
    } else {
      label.textContent = g.wave === 0 ? "Pronti al servizio" : `Ondata ${g.wave} respinta`;
      fill.style.width = g.wave === 0 ? "0%" : "100%";
      count.innerHTML = `prossima: <b>${g.wave + 1}</b>`;
    }
  }

  /* ---------- overlay ---------- */
  showResult(won, r) {
    const g = this.game;
    const rec = r.records || {};
    const recLines = [];
    if (rec.newScore) recLines.push("🏅 Nuovo record di punteggio!");
    if (rec.newWave) recLines.push("🌊 Nuovo record di ondate!");
    if (rec.newStars) recLines.push("⭐ Nuove stelle conquistate!");
    const stats = `Punteggio: ${r.score}\nPiatti sgraditi eliminati: ${r.kills}\nClienti soddisfatti rimasti: ${r.lives}`;
    if (won) {
      this.showOverlay("Servizio completato!", `Hai respinto tutte le ${CONFIG.storyWaves} ondate di ${g.map.name}.\n${stats}`, "♾️ Continua all'infinito", "🏆", {
        stars: r.stars, records: recLines, btn2: "Menu",
        action: () => { this.hideOverlay(); g.continueEndless(); this.toast("Modalità infinita: le ondate non finiscono più!"); },
        action2: () => this.showMenu(),
      });
    } else {
      const where = r.endless ? `Sei arrivato all'ondata ${r.wave} in modalità infinita.` : `I clienti se ne sono andati all'ondata ${g.wave}.`;
      this.showOverlay("La trattoria ha chiuso", `${where}\n${stats}`, "🔁 Riprova", "😢", {
        records: recLines, btn2: "Menu",
        action: () => { this.hideOverlay(); g.loadMap(g.mapKey); this.refresh(); },
        action2: () => this.showMenu(),
      });
    }
  }

  showOverlay(title, text, btnLabel, emoji, opts) {
    opts = opts || {};
    this.$("overlay-emoji").textContent = emoji || "🍕";
    this.$("overlay-title").textContent = title;
    this.$("overlay-text").textContent = text;
    this.$("overlay-btn").textContent = btnLabel;
    const stars = this.$("overlay-stars");
    stars.classList.toggle("hidden", !opts.stars);
    if (opts.stars) stars.innerHTML = [1, 2, 3].map(i => `<span class="${i <= opts.stars ? "on" : ""}" style="animation-delay:${i * 0.2}s">★</span>`).join("");
    const rec = this.$("overlay-records");
    rec.classList.toggle("hidden", !(opts.records && opts.records.length));
    rec.innerHTML = (opts.records || []).map(l => `<div>${l}</div>`).join("");
    const b2 = this.$("overlay-btn2");
    b2.classList.toggle("hidden", !opts.btn2);
    b2.textContent = opts.btn2 || "";
    this.overlayAction = opts.action || (() => this.hideOverlay());
    this.overlayAction2 = opts.action2 || null;
    this.$("overlay").classList.remove("hidden");
  }
  hideOverlay() { this.$("overlay").classList.add("hidden"); }

  toast(msg) {
    const el = this.$("toast");
    el.textContent = msg;
    el.classList.remove("hidden");
    el.style.opacity = "1";
    clearTimeout(this._toastTimer);
    this._toastTimer = setTimeout(() => { el.style.opacity = "0"; setTimeout(() => el.classList.add("hidden"), 300); }, 1800);
  }
}
