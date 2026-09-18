/* ==========================================================
   Stato di gioco e logica di aggiornamento
   ========================================================== */

/* --- salvataggio progressi (localStorage) --- */
const SaveData = {
  load() {
    try { return JSON.parse(localStorage.getItem(CONFIG.saveKey)) || { maps: {} }; }
    catch (e) { return { maps: {} }; }
  },
  save(data) {
    try { localStorage.setItem(CONFIG.saveKey, JSON.stringify(data)); } catch (e) { /* privato/quota */ }
  },
  forMap(key) {
    const d = this.load();
    return d.maps[key] || { stars: 0, bestWave: 0, bestScore: 0, wins: 0 };
  },
  record(key, result) {
    const d = this.load();
    const m = d.maps[key] || { stars: 0, bestWave: 0, bestScore: 0, wins: 0 };
    const before = { ...m };
    m.stars = Math.max(m.stars, result.stars || 0);
    m.bestWave = Math.max(m.bestWave, result.wave || 0);
    m.bestScore = Math.max(m.bestScore, result.score || 0);
    if (result.won) m.wins++;
    d.maps[key] = m;
    this.save(d);
    return { newWave: m.bestWave > before.bestWave, newScore: m.bestScore > before.bestScore, newStars: m.stars > before.stars };
  },
};

class Game {
  constructor() {
    this.cell = CONFIG.cell;
    this.width = CONFIG.cols * this.cell;
    this.height = CONFIG.rows * this.cell;
    this.listeners = {};
    this.autoWave = false;         // avvio automatico dell'ondata successiva
    this.loadMap(MAP_ORDER[0]);
  }

  /* --- eventi verso la UI --- */
  on(evt, fn) { (this.listeners[evt] = this.listeners[evt] || []).push(fn); }
  emit(evt, data) { (this.listeners[evt] || []).forEach(fn => fn(data)); }

  /* --- mappa --- */
  loadMap(key) {
    this.mapKey = key;
    this.map = MAPS[key];
    this.buildMap();
    this.reset();
    this.emit("map-loaded", key);
  }

  buildMap() {
    const c = this.cell, MAP = this.map;
    this.path = MAP.waypoints.map(([col, row]) => ({ x: (col + 0.5) * c, y: (row + 0.5) * c }));
    this.pathCells = new Set();
    for (let i = 0; i < MAP.waypoints.length - 1; i++) {
      const [c0, r0] = MAP.waypoints[i];
      const [c1, r1] = MAP.waypoints[i + 1];
      const dc = Math.sign(c1 - c0), dr = Math.sign(r1 - r0);
      let col = c0, row = r0;
      while (true) {
        if (col >= 0 && col < CONFIG.cols && row >= 0 && row < CONFIG.rows) this.pathCells.add(`${col},${row}`);
        if (col === c1 && row === r1) break;
        col += dc; row += dr;
      }
    }
    this.blockedCells = new Set(MAP.blocked.map(([c, r]) => `${c},${r}`));
  }

  isPath(col, row) { return this.pathCells.has(`${col},${row}`); }
  isBlocked(col, row) { return this.blockedCells.has(`${col},${row}`); }
  towerAt(col, row) { return this.towers.find(t => t.col === col && t.row === row) || null; }
  canBuild(col, row) {
    if (col < 0 || row < 0 || col >= CONFIG.cols || row >= CONFIG.rows) return false;
    return !this.isPath(col, row) && !this.isBlocked(col, row) && !this.towerAt(col, row);
  }

  /* --- stato --- */
  reset() {
    this.gold = CONFIG.startGold;
    this.lives = CONFIG.startLives;
    this.wave = 0;                 // ondata corrente (1-based; 0 = non iniziata)
    this.state = "idle";           // idle | wave | won | lost
    this.endless = false;          // true dopo aver scelto di continuare oltre l'ondata 10
    this.towers = [];
    this.enemies = [];
    this.projectiles = [];
    this.effects = [];
    this.texts = [];
    this.spawnQueue = [];
    this.waveClock = 0;
    this.speed = 1;
    this.paused = false;
    this.selectedTower = null;
    this.placing = null;
    this.aiming = null;            // abilità in attesa di un bersaglio
    this.hoverCell = null;
    this.hoverPos = null;
    this.totalKills = 0;
    this.time = 0;
    this.abilities = {};
    for (const k of Object.keys(ABILITIES)) this.abilities[k] = { cooldown: 0, active: 0 };
    this.rateMult = 1;
    this.shake = 0;
    this.result = null;
    this.autoTimer = 0;
  }

  /* --- punteggio --- */
  get score() {
    return this.totalKills * CONFIG.score.kill + this.wavesCleared * CONFIG.score.wave + this.lives * CONFIG.score.life;
  }
  get wavesCleared() { return this.state === "wave" ? this.wave - 1 : this.wave; }
  get stars() {
    if (this.wavesCleared < CONFIG.storyWaves) return 0;
    return this.lives >= 15 ? 3 : this.lives >= 8 ? 2 : 1;
  }

  /* --- ondate --- */
  get waveCount() { return CONFIG.storyWaves; }
  get canStartWave() { return this.state === "idle" && (this.endless || this.wave < CONFIG.storyWaves); }

  waveDef(n) {
    if (n <= CONFIG.storyWaves) return WAVES[n - 1];
    return generateEndlessWave(n, this.map.boss);
  }

  startWave() {
    if (!this.canStartWave) return false;
    this.wave++;
    this.state = "wave";
    this.waveClock = 0;
    this.spawnQueue = [];
    const def = this.waveDef(this.wave);
    let t = 0;
    for (const g of def.groups) {
      t += g.delay || 0;
      const type = g.type === "boss" ? this.map.boss : g.type;
      for (let i = 0; i < g.count; i++) {
        this.spawnQueue.push({ type, at: t });
        t += g.interval;
      }
    }
    this.waveTotal = this.spawnQueue.length;
    const story = Math.min(this.wave, CONFIG.storyWaves);
    let mult = (1 + CONFIG.hpScalePerWave * (story - 1)) * this.map.difficulty;
    if (this.wave > CONFIG.storyWaves) mult *= 1 + CONFIG.endless.hpScalePerWave * (this.wave - CONFIG.storyWaves);
    this.hpMult = mult;
    this.autoTimer = 0;
    this.emit("wave-start", this.wave);
    return true;
  }

  spawn(type, like) {
    const e = new Enemy(type, this.path, this.hpMult);
    if (like) e.placeLike(like, 24);
    this.enemies.push(e);
    return e;
  }

  endWave() {
    const bonus = CONFIG.waveBonusBase + this.wave * CONFIG.waveBonusPerWave;
    this.gold += bonus;
    this.texts.push(new FloatingText(`Ondata ${this.wave} respinta! +${bonus}💰`, this.width / 2, this.height / 2, "#ffe28a"));
    if (this.wave === CONFIG.storyWaves && !this.endless) {
      this.state = "won";
      this.finish(true);
    } else {
      this.state = "idle";
      // in modalità infinita il record di ondate si aggiorna subito
      if (this.endless) SaveData.record(this.mapKey, { wave: this.wave, score: this.score });
      this.emit("wave-end", this.wave);
      if (this.autoWave) this.autoTimer = 4;
    }
  }

  /* chiude la partita e registra il record */
  finish(won) {
    const result = { won, wave: this.wavesCleared, score: this.score, stars: won ? this.stars : 0, kills: this.totalKills, lives: this.lives, endless: this.endless };
    result.records = SaveData.record(this.mapKey, result);
    this.result = result;
    this.emit(won ? "won" : "lost", result);
  }

  /* dopo la vittoria: prosegue in modalità infinita */
  continueEndless() {
    if (this.state !== "won") return;
    this.endless = true;
    this.state = "idle";
    this.emit("change");
  }

  /* --- abilità --- */
  useAbility(key, x, y) {
    const def = ABILITIES[key], st = this.abilities[key];
    if (!def || st.cooldown > 0 || this.state !== "wave") return false;
    if (def.aim && x === undefined) { this.aiming = key; this.placing = null; this.selectedTower = null; this.emit("change"); return true; }
    this.aiming = null;
    st.cooldown = def.cooldown;
    if (key === "mammamia") {
      for (const e of this.enemies) { e.applyStun(def.stun); this.effects.push(new Effect("stun", e.x, e.y, 16)); }
      this.effects.push(new Effect("shout", this.width / 2, this.height / 2, 60, { life: 0.8 }));
      this.shake = 0.4;
    } else if (key === "espresso") {
      st.active = def.duration;
      this.effects.push(new Effect("shout", this.width / 2, this.height / 2, 60, { life: 0.6, color: "#ffc247" }));
    } else if (key === "olio") {
      for (const e of this.enemies) {
        if (dist(x, y, e.x, e.y) <= def.radius) e.takeDamage(def.dmg, true);
      }
      this.effects.push(new Effect("ring", x, y, def.radius, { life: 0.45 }));
      this.effects.push(new Effect("fire", x, y, def.burnRadius, { life: def.burnTime, dps: def.burnDps }));
      this.shake = 0.25;
    }
    this.emit("ability", key);
    this.emit("change");
    return true;
  }

  /* --- azioni giocatore --- */
  selectShop(type) {
    this.placing = (this.placing === type) ? null : type;
    this.selectedTower = null;
    this.aiming = null;
    this.emit("change");
  }

  cancel() { this.placing = null; this.selectedTower = null; this.aiming = null; this.emit("change"); }

  clickAt(x, y) {
    if (this.aiming) { this.useAbility(this.aiming, x, y); return; }
    this.clickCell(Math.floor(x / this.cell), Math.floor(y / this.cell));
  }

  clickCell(col, row) {
    if (this.state === "won" || this.state === "lost") return;
    const existing = this.towerAt(col, row);
    if (this.placing) {
      if (!this.canBuild(col, row)) {
        if (existing) { this.selectedTower = existing; this.placing = null; }
        else { this.emit("toast", "Non si può piazzare qui."); this.emit("sfx", "error"); }
        this.emit("change");
        return;
      }
      const def = TOWERS[this.placing];
      if (this.gold < def.cost) { this.emit("toast", "Mance insufficienti!"); this.emit("sfx", "error"); return; }
      this.gold -= def.cost;
      this.emit("sfx", "build");
      const t = new Tower(this.placing, col, row);
      this.towers.push(t);
      this.texts.push(new FloatingText(`-${def.cost}💰`, t.x, t.y - 10, "#ffb0a0"));
      if (this.gold < def.cost) this.placing = null;
      this.emit("change");
      return;
    }
    this.selectedTower = existing;
    this.emit("change");
  }

  upgradeSelected() {
    const t = this.selectedTower;
    if (!t || t.maxLevel) return;
    const cost = t.upgradeCost;
    if (this.gold < cost) { this.emit("toast", "Mance insufficienti!"); this.emit("sfx", "error"); return; }
    this.gold -= cost;
    t.upgrade();
    this.emit("sfx", "upgrade");
    this.texts.push(new FloatingText("⬆️ Livello " + (t.level + 1), t.x, t.y - 14, "#b8f08a"));
    this.emit("change");
  }

  sellSelected() {
    const t = this.selectedTower;
    if (!t) return;
    this.gold += t.sellValue;
    this.emit("sfx", "sell");
    this.texts.push(new FloatingText(`+${t.sellValue}💰`, t.x, t.y - 10, "#ffe28a"));
    this.towers = this.towers.filter(x => x !== t);
    this.projectiles = this.projectiles.filter(p => p.tower !== t);
    this.selectedTower = null;
    this.emit("change");
  }

  toggleSpeed() { this.speed = this.speed >= 3 ? 1 : this.speed + 1; this.emit("change"); }
  toggleAutoWave() { this.autoWave = !this.autoWave; this.autoTimer = 0; this.emit("change"); }
  togglePause() { this.paused = !this.paused; this.emit("change"); }

  /* --- ciclo di aggiornamento --- */
  update(rawDt) {
    if (this.paused || this.state === "won" || this.state === "lost") {
      this.updateCosmetics(rawDt);
      return;
    }
    const dt = rawDt * this.speed;
    this.time += dt;

    // avvio automatico dell'ondata successiva
    if (this.autoWave && this.state === "idle" && this.wave > 0 && this.canStartWave) {
      this.autoTimer -= dt;
      if (this.autoTimer <= 0) { this.startWave(); this.emit("change"); }
    }

    // abilità: ricariche e durate
    this.rateMult = 1;
    for (const [k, st] of Object.entries(this.abilities)) {
      if (st.cooldown > 0) st.cooldown = Math.max(0, st.cooldown - dt);
      if (st.active > 0) { st.active = Math.max(0, st.active - dt); if (k === "espresso" && st.active > 0) this.rateMult = ABILITIES.espresso.rateMult; }
    }

    // spawn
    if (this.state === "wave") {
      this.waveClock += dt;
      while (this.spawnQueue.length && this.spawnQueue[0].at <= this.waveClock) {
        this.spawn(this.spawnQueue.shift().type);
      }
    }

    // nemici
    const endP = this.path[this.path.length - 1];
    for (const e of this.enemies) {
      e.update(dt);
      if (e.justBlinked) this.effects.push(new Effect("blink", e.x, e.y, e.size, { life: 0.35, color: e.def.color }));
      if (e.reachedEnd) {
        this.lives -= e.livesCost;
        this.texts.push(new FloatingText(`-${e.livesCost}❤️`, Math.min(Math.max(endP.x, 40), this.width - 40), Math.min(Math.max(endP.y - 20, 20), this.height - 20), "#ff7b6b"));
        this.shake = Math.max(this.shake, 0.2);
        this.emit("sfx", "lifeLost");
        if (this.lives <= 0) {
          this.lives = 0;
          this.state = "lost";
          this.finish(false);
        }
      }
    }

    // pozze di fuoco: le pozze sovrapposte non si sommano, conta la più forte
    const fires = this.effects.filter(fx => fx.kind === "fire");
    if (fires.length) {
      for (const e of this.enemies) {
        if (e.dead || e.reachedEnd) continue;
        let best = null;
        for (const fx of fires) {
          if (dist(fx.x, fx.y, e.x, e.y) <= fx.radius + e.size * 0.3 && (!best || fx.dps > best.dps)) best = fx;
        }
        if (best) { e.takeDamage(best.dps * dt, true); if (e.dead && best.owner) best.owner.kills++; }
      }
    }

    // torri
    const nBefore = this.projectiles.length;
    for (const t of this.towers) t.update(dt, this.enemies, this.projectiles, this.rateMult);
    for (let i = nBefore; i < this.projectiles.length; i++) this.emit("shoot", this.projectiles[i].tower.type);

    // proiettili
    for (const p of this.projectiles) p.update(dt, this.enemies, this.effects);
    this.projectiles = this.projectiles.filter(p => !p.done);

    // rimozione nemici morti (con ricompensa ed eventuali figli)
    const spawned = [];
    for (const e of this.enemies) {
      if (e.dead) {
        this.gold += e.reward;
        this.totalKills++;
        this.texts.push(new FloatingText(`+${e.reward}`, e.x, e.y - 12));
        this.effects.push(new Effect("pop", e.x, e.y, e.size));
        spawnBurst(this.effects, e.x, e.y, e.def.color || "#ff8a65", e.def.boss ? 40 : 10);
        if (e.def.boss) this.shake = Math.max(this.shake, 0.5);
        this.emit("kill", e.def.boss);
        if (e.def.spawnOnDeath && !e.reachedEnd) {
          for (let i = 0; i < e.def.spawnOnDeath.count; i++) spawned.push([e.def.spawnOnDeath.type, e]);
        }
      }
    }
    const before = this.enemies.length;
    this.enemies = this.enemies.filter(e => !e.dead && !e.reachedEnd);
    for (const [type, like] of spawned) this.spawn(type, like);
    if (before !== this.enemies.length) this.emit("change");

    // fine ondata
    if (this.state === "wave" && this.spawnQueue.length === 0 && this.enemies.length === 0) {
      this.endWave();
      this.emit("change");
    }

    this.updateCosmetics(dt);
  }

  updateCosmetics(dt) {
    if (this.shake > 0) this.shake = Math.max(0, this.shake - dt);
    for (const fx of this.effects) fx.update(dt);
    this.effects = this.effects.filter(fx => !fx.done);
    for (const t of this.texts) t.update(dt);
    this.texts = this.texts.filter(t => !t.done);
  }
}
