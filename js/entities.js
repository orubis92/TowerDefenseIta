/* ==========================================================
   Entità di gioco: Enemy, Tower, Projectile, Effect, FloatingText
   ========================================================== */

function dist(ax, ay, bx, by) {
  const dx = ax - bx, dy = ay - by;
  return Math.hypot(dx, dy);
}

class Enemy {
  constructor(typeKey, path, hpMult) {
    const def = ENEMIES[typeKey];
    this.type = typeKey;
    this.def = def;
    this.path = path;              // array di {x, y} in pixel
    this.maxHp = Math.round(def.hp * hpMult);
    this.hp = this.maxHp;
    this.baseSpeed = def.speed;
    this.armor = def.armor;
    this.reward = def.reward;
    this.livesCost = def.livesCost;
    this.size = def.size;
    this.x = path[0].x;
    this.y = path[0].y;
    this.wpIndex = 1;              // prossimo waypoint
    this.progress = 0;             // distanza percorsa (per il targeting)
    this.slowFactor = 1;
    this.slowTimer = 0;
    this.stunTimer = 0;
    this.blinkTimer = def.blink ? def.blink.every : 0;
    this.justBlinked = false;
    this.dead = false;
    this.reachedEnd = false;
    this.wobble = Math.random() * Math.PI * 2;
    this.hitFlash = 0;
  }

  get speed() { return this.stunTimer > 0 ? 0 : this.baseSpeed * this.slowFactor; }
  get stunned() { return this.stunTimer > 0; }

  applySlow(factor, time) {
    this.slowFactor = Math.min(this.slowFactor, 1 - factor);
    this.slowTimer = Math.max(this.slowTimer, time);
  }

  applyStun(time) {
    // i boss resistono: metà durata
    const t = this.def.boss ? time * 0.5 : time;
    this.stunTimer = Math.max(this.stunTimer, t);
  }

  takeDamage(amount, ignoreArmor) {
    const dmg = ignoreArmor ? amount : Math.max(1, amount - this.armor);
    this.hp -= dmg;
    this.hitFlash = 0.12;
    if (this.hp <= 0) this.dead = true;
    return dmg;
  }

  /* posiziona il nemico dove si trova un altro (per gli spawn alla morte) */
  placeLike(other, jitter) {
    this.x = other.x + (Math.random() - 0.5) * jitter;
    this.y = other.y + (Math.random() - 0.5) * jitter;
    this.wpIndex = other.wpIndex;
    this.progress = other.progress + (Math.random() - 0.5) * jitter;
  }

  advance(distance) {
    let remaining = distance;
    while (remaining > 0 && this.wpIndex < this.path.length) {
      const target = this.path[this.wpIndex];
      const d = dist(this.x, this.y, target.x, target.y);
      if (d <= remaining) {
        this.x = target.x; this.y = target.y;
        this.progress += d;
        remaining -= d;
        this.wpIndex++;
      } else {
        this.x += (target.x - this.x) / d * remaining;
        this.y += (target.y - this.y) / d * remaining;
        this.progress += remaining;
        remaining = 0;
      }
    }
    if (this.wpIndex >= this.path.length) this.reachedEnd = true;
  }

  update(dt) {
    if (this.slowTimer > 0) {
      this.slowTimer -= dt;
      if (this.slowTimer <= 0) { this.slowFactor = 1; this.slowTimer = 0; }
    }
    if (this.stunTimer > 0) this.stunTimer -= dt;
    if (this.hitFlash > 0) this.hitFlash -= dt;
    this.wobble += dt * (this.stunned ? 2 : 8);
    this.justBlinked = false;

    if (this.def.blink && !this.stunned) {
      this.blinkTimer -= dt;
      if (this.blinkTimer <= 0) {
        this.blinkTimer = this.def.blink.every;
        this.advance(this.def.blink.distance);
        this.justBlinked = true;
      }
    }
    this.advance(this.speed * dt);
  }
}

class Tower {
  constructor(typeKey, col, row) {
    const def = TOWERS[typeKey];
    this.type = typeKey;
    this.def = def;
    this.col = col;
    this.row = row;
    this.x = (col + 0.5) * CONFIG.cell;
    this.y = (row + 0.5) * CONFIG.cell;
    this.level = 0;
    this.cooldown = 0;
    this.kills = 0;
    this.invested = def.cost;
    this.angle = 0;
    this.recoil = 0;
  }

  get stats() { return this.def.levels[this.level]; }
  get maxLevel() { return this.level >= this.def.levels.length - 1; }
  get upgradeCost() { return this.maxLevel ? null : this.def.levels[this.level + 1].cost; }
  get sellValue() { return Math.floor(this.invested * CONFIG.sellRatio); }

  upgrade() {
    if (this.maxLevel) return false;
    this.invested += this.upgradeCost;
    this.level++;
    return true;
  }

  findTarget(enemies) {
    const r = this.stats.range;
    let best = null;
    for (const e of enemies) {
      if (e.dead || e.reachedEnd) continue;
      if (dist(this.x, this.y, e.x, e.y) <= r) {
        // il carabiniere preferisce chi non è già fermo
        if (this.stats.stun && e.stunned && best && !best.stunned) continue;
        if (!best || e.progress > best.progress || (this.stats.stun && best.stunned && !e.stunned)) best = e;
      }
    }
    return best;
  }

  update(dt, enemies, projectiles, rateMult) {
    if (this.recoil > 0) this.recoil -= dt;
    this.cooldown -= dt;
    if (this.cooldown > 0) return;
    const target = this.findTarget(enemies);
    if (!target) return;
    this.angle = Math.atan2(target.y - this.y, target.x - this.x);
    projectiles.push(new Projectile(this, target));
    this.cooldown = 1 / (this.stats.rate * (rateMult || 1));
    this.recoil = 0.15;
  }
}

class Projectile {
  constructor(tower, target) {
    this.tower = tower;
    this.target = target;
    this.x = tower.x;
    this.y = tower.y;
    const s = tower.stats;
    this.speed = s.projSpeed;
    this.dmg = s.dmg;
    this.splash = s.splash || 0;
    this.slow = s.slow || 0;
    this.slowTime = s.slowTime || 0;
    this.stun = s.stun || 0;
    this.burn = s.burnDps ? { dps: s.burnDps, time: s.burnTime, radius: s.burnRadius } : null;
    this.emoji = tower.def.projectileEmoji;
    this.spin = 0;
    this.done = false;
    // ultima posizione nota del bersaglio, per non sparire se muore prima
    this.lastX = target.x; this.lastY = target.y;
  }

  update(dt, enemies, effects) {
    if (!this.target.dead && !this.target.reachedEnd) {
      this.lastX = this.target.x; this.lastY = this.target.y;
    }
    const d = dist(this.x, this.y, this.lastX, this.lastY);
    const step = this.speed * dt;
    this.spin += dt * 12;
    if (d <= step) {
      this.x = this.lastX; this.y = this.lastY;
      this.impact(enemies, effects);
      this.done = true;
      return;
    }
    this.x += (this.lastX - this.x) / d * step;
    this.y += (this.lastY - this.y) / d * step;
  }

  impact(enemies, effects) {
    const hits = [];
    if (this.splash > 0) {
      for (const e of enemies) {
        if (e.dead || e.reachedEnd) continue;
        if (dist(this.x, this.y, e.x, e.y) <= this.splash) hits.push(e);
      }
      effects.push(new Effect("ring", this.x, this.y, this.splash));
    } else if (!this.target.dead && !this.target.reachedEnd) {
      hits.push(this.target);
    }
    for (const e of hits) {
      e.takeDamage(this.dmg);
      if (this.slow > 0) e.applySlow(this.slow, this.slowTime);
      if (this.stun > 0) { e.applyStun(this.stun); effects.push(new Effect("stun", e.x, e.y, 16)); }
      if (e.dead) this.tower.kills++;
    }
    if (this.burn) {
      effects.push(new Effect("fire", this.x, this.y, this.burn.radius, { life: this.burn.time, dps: this.burn.dps, owner: this.tower }));
    }
  }
}

class Effect {
  constructor(kind, x, y, radius, opts) {
    this.kind = kind;
    this.x = x; this.y = y;
    this.radius = radius;
    this.maxLife = (opts && opts.life) || 0.3;
    this.life = this.maxLife;
    this.vx = (opts && opts.vx) || 0;
    this.vy = (opts && opts.vy) || 0;
    this.color = (opts && opts.color) || "#fff";
    this.dps = (opts && opts.dps) || 0;
    this.owner = opts && opts.owner;
    this.seed = Math.random() * 100;
  }
  update(dt) {
    this.life -= dt;
    if (this.kind === "particle") {
      this.x += this.vx * dt; this.y += this.vy * dt;
      this.vy += 320 * dt; // gravità
      this.vx *= 0.98;
    }
  }
  get done() { return this.life <= 0; }
}

/* esplosione di coriandoli alla morte di un nemico */
function spawnBurst(effects, x, y, color, n) {
  for (let i = 0; i < n; i++) {
    const a = Math.random() * Math.PI * 2, s = 60 + Math.random() * 140;
    effects.push(new Effect("particle", x, y, 2 + Math.random() * 3, {
      vx: Math.cos(a) * s, vy: Math.sin(a) * s - 60, life: 0.45 + Math.random() * 0.35,
      color: Math.random() < 0.5 ? color : "#ffd27a",
    }));
  }
}

class FloatingText {
  constructor(text, x, y, color) {
    this.text = text; this.x = x; this.y = y; this.color = color || "#ffe28a";
    this.life = 0.9; this.maxLife = 0.9;
  }
  update(dt) { this.life -= dt; this.y -= 28 * dt; }
  get done() { return this.life <= 0; }
}
