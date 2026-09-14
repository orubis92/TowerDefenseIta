/* ==========================================================
   Stato di gioco e logica di aggiornamento
   ========================================================== */

class Game {
  constructor() {
    this.cell = CONFIG.cell;
    this.width = CONFIG.cols * this.cell;
    this.height = CONFIG.rows * this.cell;
    this.buildMap();
    this.reset();
    this.listeners = {};
  }

  /* --- eventi verso la UI --- */
  on(evt, fn) { (this.listeners[evt] = this.listeners[evt] || []).push(fn); }
  emit(evt, data) { (this.listeners[evt] || []).forEach(fn => fn(data)); }

  /* --- mappa --- */
  buildMap() {
    const c = this.cell;
    this.path = MAP.waypoints.map(([col, row]) => ({ x: (col + 0.5) * c, y: (row + 0.5) * c }));
    // celle occupate dal percorso
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
    this.pathLength = 0;
    for (let i = 1; i < this.path.length; i++) {
      this.pathLength += dist(this.path[i - 1].x, this.path[i - 1].y, this.path[i].x, this.path[i].y);
    }
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
    this.towers = [];
    this.enemies = [];
    this.projectiles = [];
    this.effects = [];
    this.texts = [];
    this.spawnQueue = [];          // {type, at} in secondi dall'inizio ondata
    this.waveClock = 0;
    this.speed = 1;
    this.paused = false;
    this.selectedTower = null;     // torre selezionata sulla mappa
    this.placing = null;           // tipo di torre da piazzare
    this.hoverCell = null;
    this.totalKills = 0;
  }

  /* --- ondate --- */
  get waveCount() { return WAVES.length; }
  get nextWaveIndex() { return this.wave; } // indice 0-based della prossima ondata
  get canStartWave() { return (this.state === "idle") && this.wave < WAVES.length; }

  startWave() {
    if (!this.canStartWave) return false;
    this.wave++;
    this.state = "wave";
    this.waveClock = 0;
    this.spawnQueue = [];
    const def = WAVES[this.wave - 1];
    let t = 0;
    for (const g of def.groups) {
      t += g.delay || 0;
      for (let i = 0; i < g.count; i++) {
        this.spawnQueue.push({ type: g.type, at: t });
        t += g.interval;
      }
    }
    this.hpMult = 1 + CONFIG.hpScalePerWave * (this.wave - 1);
    this.emit("wave-start", this.wave);
    return true;
  }

  spawn(type) {
    const e = new Enemy(type, this.path, this.hpMult);
    this.enemies.push(e);
  }

  endWave() {
    const bonus = CONFIG.waveBonusBase + this.wave * CONFIG.waveBonusPerWave;
    this.gold += bonus;
    this.texts.push(new FloatingText(`Ondata ${this.wave} respinta! +${bonus}💰`, this.width / 2, this.height / 2, "#ffe28a"));
    if (this.wave >= WAVES.length) {
      this.state = "won";
      this.emit("won");
    } else {
      this.state = "idle";
      this.emit("wave-end", this.wave);
    }
  }

  /* --- azioni giocatore --- */
  selectShop(type) {
    this.placing = (this.placing === type) ? null : type;
    this.selectedTower = null;
    this.emit("change");
  }

  clickCell(col, row) {
    if (this.state === "won" || this.state === "lost") return;
    const existing = this.towerAt(col, row);
    if (this.placing) {
      if (!this.canBuild(col, row)) {
        if (existing) { this.selectedTower = existing; this.placing = null; }
        else this.emit("toast", "Non si può piazzare qui.");
        this.emit("change");
        return;
      }
      const def = TOWERS[this.placing];
      if (this.gold < def.cost) { this.emit("toast", "Mance insufficienti!"); return; }
      this.gold -= def.cost;
      const t = new Tower(this.placing, col, row);
      this.towers.push(t);
      this.texts.push(new FloatingText(`-${def.cost}💰`, t.x, t.y - 10, "#ffb0a0"));
      // mantieni la modalità di piazzamento se si può ancora permettere
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
    if (this.gold < cost) { this.emit("toast", "Mance insufficienti!"); return; }
    this.gold -= cost;
    t.upgrade();
    this.texts.push(new FloatingText("⬆️ Livello " + (t.level + 1), t.x, t.y - 14, "#b8f08a"));
    this.emit("change");
  }

  sellSelected() {
    const t = this.selectedTower;
    if (!t) return;
    this.gold += t.sellValue;
    this.texts.push(new FloatingText(`+${t.sellValue}💰`, t.x, t.y - 10, "#ffe28a"));
    this.towers = this.towers.filter(x => x !== t);
    this.projectiles = this.projectiles.filter(p => p.tower !== t);
    this.selectedTower = null;
    this.emit("change");
  }

  toggleSpeed() { this.speed = this.speed === 1 ? 2 : 1; this.emit("change"); }
  togglePause() { this.paused = !this.paused; this.emit("change"); }

  /* --- ciclo di aggiornamento --- */
  update(rawDt) {
    if (this.paused || this.state === "won" || this.state === "lost") {
      this.updateCosmetics(rawDt);
      return;
    }
    const dt = rawDt * this.speed;

    // spawn
    if (this.state === "wave") {
      this.waveClock += dt;
      while (this.spawnQueue.length && this.spawnQueue[0].at <= this.waveClock) {
        this.spawn(this.spawnQueue.shift().type);
      }
    }

    // nemici
    for (const e of this.enemies) {
      e.update(dt);
      if (e.reachedEnd) {
        this.lives -= e.livesCost;
        this.texts.push(new FloatingText(`-${e.livesCost}❤️`, this.path[this.path.length - 1].x - 30, this.path[this.path.length - 1].y - 20, "#ff7b6b"));
        if (this.lives <= 0) {
          this.lives = 0;
          this.state = "lost";
          this.emit("lost");
        }
      }
    }

    // torri
    for (const t of this.towers) t.update(dt, this.enemies, this.projectiles);

    // proiettili
    for (const p of this.projectiles) p.update(dt, this.enemies, this.effects);
    this.projectiles = this.projectiles.filter(p => !p.done);

    // rimozione nemici morti (con ricompensa)
    for (const e of this.enemies) {
      if (e.dead) {
        this.gold += e.reward;
        this.totalKills++;
        this.texts.push(new FloatingText(`+${e.reward}`, e.x, e.y - 12));
        this.effects.push(new Effect("pop", e.x, e.y, e.size));
      }
    }
    const before = this.enemies.length;
    this.enemies = this.enemies.filter(e => !e.dead && !e.reachedEnd);
    if (before !== this.enemies.length) this.emit("change");

    // fine ondata
    if (this.state === "wave" && this.spawnQueue.length === 0 && this.enemies.length === 0) {
      this.endWave();
      this.emit("change");
    }

    this.updateCosmetics(dt);
  }

  updateCosmetics(dt) {
    for (const fx of this.effects) fx.update(dt);
    this.effects = this.effects.filter(fx => !fx.done);
    for (const t of this.texts) t.update(dt);
    this.texts = this.texts.filter(t => !t.done);
  }
}
