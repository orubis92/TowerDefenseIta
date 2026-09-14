/* ==========================================================
   Trattoria Defense — configurazione di gioco
   Tutti i numeri di bilanciamento vivono qui.
   ========================================================== */
const CONFIG = {
  cell: 48,          // dimensione piastrella in px
  cols: 16,
  rows: 10,
  startGold: 200,
  startLives: 20,
  sellRatio: 0.6,    // percentuale restituita alla vendita
  waveBonusBase: 25, // oro a fine ondata = base + wave * perWave
  waveBonusPerWave: 5,
  hpScalePerWave: 0.22, // +22% HP nemici per ondata oltre la prima
  storyWaves: 10,       // ondate "storia" prima della modalità infinita
  endless: {
    hpScalePerWave: 0.35,   // crescita HP oltre l'ondata 10
    bossEvery: 5,           // un boss ogni N ondate infinite
  },
  score: { kill: 10, wave: 150, life: 20 },
  saveKey: "trattoria-defense-save-v1",
};

/* ----------------------------------------------------------
   Mappe. waypoints in coordinate di cella (col, row); primo e
   ultimo fuori schermo. boss = nemico dell'ondata 10.
   ---------------------------------------------------------- */
const MAPS = {
  trattoria: {
    name: "La Trattoria",
    subtitle: "Il classico. Un percorso a serpentina, tanto spazio.",
    emoji: "🍝",
    difficulty: 1,
    boss: "carbonara",
    palette: { floorHue: 28, floorSat: 45, floorLight: 62, path: "#c9463a", pathDark: "#7d2216", pathLight: "rgba(255,220,190,0.55)" },
    waypoints: [[-1, 1], [3, 1], [3, 5], [8, 5], [8, 2], [12, 2], [12, 7], [16, 7]],
    blocked: [[0, 8], [1, 8], [0, 9], [1, 9], [14, 0], [15, 0]],
    decorations: [
      { col: 0.5, row: 8.5, emoji: "🧊", size: 26 }, { col: 1.5, row: 8.5, emoji: "🥬", size: 22 },
      { col: 0.5, row: 9.5, emoji: "🍅", size: 22 }, { col: 1.5, row: 9.5, emoji: "🧀", size: 22 },
      { col: 14.5, row: 0.5, emoji: "🔥", size: 24 }, { col: 15.5, row: 0.5, emoji: "🍳", size: 24 },
    ],
  },
  pizzeria: {
    name: "Pizzeria Napoletana",
    subtitle: "Percorso corto e nervoso: poco tempo per colpire.",
    emoji: "🍕",
    difficulty: 1.25,
    boss: "ananasgigante",
    palette: { floorHue: 210, floorSat: 12, floorLight: 70, path: "#b8892f", pathDark: "#6b4a10", pathLight: "rgba(255,240,200,0.55)" },
    waypoints: [[8, -1], [8, 2], [3, 2], [3, 7], [12, 7], [12, 4], [16, 4]],
    blocked: [[0, 0], [1, 0], [0, 1], [1, 1], [14, 9], [15, 9], [7, 4], [8, 4], [7, 5], [8, 5]],
    decorations: [
      { col: 1, row: 1, emoji: "🔥", size: 44 },
      { col: 14.5, row: 9.5, emoji: "🪵", size: 22 }, { col: 15.5, row: 9.5, emoji: "🪵", size: 22 },
      { col: 8, row: 5, emoji: "🍕", size: 50 },
    ],
  },
  sagra: {
    name: "Sagra in Piazza",
    subtitle: "Percorso lunghissimo ma i tavoli occupano mezza piazza.",
    emoji: "🎪",
    difficulty: 1.5,
    boss: "ananasgigante",
    palette: { floorHue: 90, floorSat: 25, floorLight: 52, path: "#8f7a5a", pathDark: "#4d3d26", pathLight: "rgba(255,255,220,0.45)" },
    waypoints: [[-1, 0], [1, 0], [1, 8], [4, 8], [4, 1], [7, 1], [7, 8], [10, 8], [10, 1], [13, 1], [13, 8], [16, 8]],
    blocked: [[2, 3], [2, 4], [5, 4], [5, 5], [8, 3], [8, 4], [11, 4], [11, 5], [14, 3], [15, 3], [14, 6], [15, 6], [0, 9], [15, 0]],
    decorations: [
      { col: 2.5, row: 4, emoji: "🪑", size: 30 }, { col: 5.5, row: 5, emoji: "🪑", size: 30 },
      { col: 8.5, row: 4, emoji: "🪑", size: 30 }, { col: 11.5, row: 5, emoji: "🪑", size: 30 },
      { col: 15, row: 3.5, emoji: "🎪", size: 40 }, { col: 15, row: 6.5, emoji: "🎶", size: 34 },
      { col: 0.5, row: 9.5, emoji: "🌳", size: 30 }, { col: 15.5, row: 0.5, emoji: "🌳", size: 30 },
    ],
  },
};
const MAP_ORDER = ["trattoria", "pizzeria", "sagra"];

/* ----------------------------------------------------------
   Torri (la brigata). Ogni livello sovrascrive il precedente.
   Effetti speciali: splash (area), slow/slowTime, stun (secondi),
   burn (crea una pozza di fuoco: burnDps, burnTime, burnRadius).
   ---------------------------------------------------------- */
const TOWERS = {
  pizzaiolo: {
    name: "Pizzaiolo", emoji: "🍕", projectileEmoji: "🍕",
    desc: "Lancia pizze. Equilibrato.", cost: 60,
    levels: [
      { dmg: 12, range: 115, rate: 1.2, projSpeed: 280 },
      { dmg: 20, range: 130, rate: 1.3, projSpeed: 300, cost: 50 },
      { dmg: 36, range: 140, rate: 1.5, projSpeed: 320, cost: 90 },
    ],
  },
  nonna: {
    name: "Nonna", emoji: "👵", projectileEmoji: "🥖",
    desc: "Mattarellate ad area. Corta gittata.", cost: 80,
    levels: [
      { dmg: 30, range: 75, rate: 0.6, projSpeed: 220, splash: 45 },
      { dmg: 50, range: 85, rate: 0.65, projSpeed: 220, splash: 50, cost: 70 },
      { dmg: 85, range: 95, rate: 0.7, projSpeed: 240, splash: 60, cost: 120 },
    ],
  },
  gelataio: {
    name: "Gelataio", emoji: "🍦", projectileEmoji: "🧊",
    desc: "Granita: rallenta i nemici.", cost: 75,
    levels: [
      { dmg: 4, range: 100, rate: 0.8, projSpeed: 240, slow: 0.5, slowTime: 1.5 },
      { dmg: 6, range: 110, rate: 0.9, projSpeed: 240, slow: 0.6, slowTime: 2.0, cost: 60 },
      { dmg: 10, range: 125, rate: 1.0, projSpeed: 260, slow: 0.65, slowTime: 2.5, cost: 100 },
    ],
  },
  sommelier: {
    name: "Sommelier", emoji: "🍷", projectileEmoji: "🍾",
    desc: "Tappi a lunga gittata. Lento, letale.", cost: 100,
    levels: [
      { dmg: 50, range: 170, rate: 0.35, projSpeed: 420 },
      { dmg: 90, range: 185, rate: 0.4, projSpeed: 440, cost: 100 },
      { dmg: 160, range: 200, rate: 0.45, projSpeed: 460, cost: 160 },
    ],
  },
  barista: {
    name: "Barista", emoji: "☕", projectileEmoji: "🫘",
    desc: "Raffica di chicchi: tanti colpi leggeri.", cost: 90,
    levels: [
      { dmg: 5, range: 105, rate: 4.0, projSpeed: 380 },
      { dmg: 8, range: 115, rate: 4.5, projSpeed: 400, cost: 70 },
      { dmg: 13, range: 125, rate: 5.0, projSpeed: 420, cost: 120 },
    ],
  },
  carabiniere: {
    name: "Carabiniere", emoji: "👮", projectileEmoji: "🛑",
    desc: "Ferma il nemico per qualche secondo.", cost: 110,
    levels: [
      { dmg: 8, range: 120, rate: 0.5, projSpeed: 360, stun: 1.2 },
      { dmg: 14, range: 130, rate: 0.55, projSpeed: 380, stun: 1.6, cost: 80 },
      { dmg: 24, range: 145, rate: 0.6, projSpeed: 400, stun: 2.2, cost: 140 },
    ],
  },
  nonno: {
    name: "Nonno", emoji: "👴", projectileEmoji: "🥃",
    desc: "Grappa in fiamme: brucia il percorso.", cost: 120,
    levels: [
      { dmg: 10, range: 110, rate: 0.5, projSpeed: 240, burnDps: 18, burnTime: 2.5, burnRadius: 34 },
      { dmg: 16, range: 120, rate: 0.55, projSpeed: 250, burnDps: 30, burnTime: 3.0, burnRadius: 38, cost: 90 },
      { dmg: 25, range: 130, rate: 0.6, projSpeed: 260, burnDps: 50, burnTime: 3.5, burnRadius: 44, cost: 150 },
    ],
  },
};

/* ----------------------------------------------------------
   Abilità speciali (con ricarica in secondi).
   ---------------------------------------------------------- */
const ABILITIES = {
  mammamia: {
    name: "Mamma mia!", emoji: "😱", key: "Q",
    desc: "La nonna urla: tutti i nemici restano impietriti per 2,5 s.",
    cooldown: 45, stun: 2.5,
  },
  espresso: {
    name: "Espresso", emoji: "⚡", key: "W",
    desc: "Doppio caffè alla brigata: tutte le torri sparano al doppio per 8 s.",
    cooldown: 40, duration: 8, rateMult: 2,
  },
  olio: {
    name: "Olio bollente", emoji: "🫗", key: "E",
    desc: "Tocca un punto: 80 danni ad area e una pozza di fuoco per 3 s.",
    cooldown: 30, dmg: 80, radius: 70, burnDps: 25, burnTime: 3, burnRadius: 55, aim: true,
  },
};

/* ----------------------------------------------------------
   Nemici (i clienti sgraditi). armor = danno sottratto a ogni colpo.
   blink = teletrasporto in avanti ogni N secondi.
   spawnOnDeath = genera altri nemici alla morte.
   ---------------------------------------------------------- */
const ENEMIES = {
  ananas: {
    name: "Ananas sulla pizza", emoji: "🍍",
    hp: 30, speed: 55, reward: 6, armor: 0, livesCost: 1, size: 22, color: "#ffd54a",
  },
  ketchup: {
    name: "Ketchup sulla pasta", emoji: "🥫",
    hp: 18, speed: 110, reward: 6, armor: 0, livesCost: 1, size: 20, color: "#ff4d3a",
  },
  cappuccino: {
    name: "Cappuccino dopo pranzo", emoji: "☕",
    hp: 110, speed: 40, reward: 14, armor: 2, livesCost: 2, size: 24, color: "#c48a5a",
  },
  turista: {
    name: "Turista con lo zaino", emoji: "🎒",
    hp: 260, speed: 34, reward: 22, armor: 4, livesCost: 3, size: 26, color: "#6cc3ff",
  },
  influencer: {
    name: "Influencer", emoji: "🤳",
    hp: 45, speed: 70, reward: 10, armor: 0, livesCost: 1, size: 22, color: "#ff7ad9",
    blink: { every: 2.5, distance: 70 },
  },
  carbonara: {
    name: "Carbonara con la panna", emoji: "🍝",
    hp: 800, speed: 32, reward: 120, armor: 4, livesCost: 5, size: 32, boss: true, color: "#fff1b8",
  },
  ananasgigante: {
    name: "Ananas Gigante", emoji: "🍍",
    hp: 650, speed: 38, reward: 100, armor: 3, livesCost: 5, size: 40, boss: true, color: "#ffe066",
    spawnOnDeath: { type: "ananas", count: 6 },
  },
};

/* ----------------------------------------------------------
   Ondate "storia" (1-10). type "boss" = il boss della mappa.
   interval = secondi tra uno spawn e l'altro, delay = attesa
   prima che il gruppo inizi (dopo il precedente).
   ---------------------------------------------------------- */
const WAVES = [
  { groups: [{ type: "ananas", count: 6, interval: 1.5 }] },
  { groups: [{ type: "ananas", count: 8, interval: 1.2 }, { type: "ketchup", count: 3, interval: 0.8, delay: 2 }] },
  { groups: [{ type: "ketchup", count: 12, interval: 0.5 }] },
  { groups: [{ type: "ananas", count: 8, interval: 0.8 }, { type: "cappuccino", count: 3, interval: 2.0, delay: 3 }] },
  { groups: [{ type: "cappuccino", count: 5, interval: 1.6 }, { type: "influencer", count: 4, interval: 1.0, delay: 3 }] },
  { groups: [{ type: "ananas", count: 20, interval: 0.5 }, { type: "turista", count: 1, interval: 1, delay: 2 }] },
  { groups: [{ type: "ketchup", count: 15, interval: 0.35 }, { type: "influencer", count: 6, interval: 0.8, delay: 2 }] },
  { groups: [{ type: "cappuccino", count: 8, interval: 1.2 }, { type: "turista", count: 3, interval: 2.5, delay: 3 }] },
  { groups: [{ type: "ananas", count: 15, interval: 0.5 }, { type: "influencer", count: 8, interval: 0.6, delay: 2 }, { type: "turista", count: 3, interval: 2.0, delay: 3 }] },
  { groups: [{ type: "ketchup", count: 10, interval: 0.4 }, { type: "boss", count: 1, interval: 1, delay: 4 }, { type: "ketchup", count: 10, interval: 0.3, delay: 1 }, { type: "cappuccino", count: 6, interval: 1.2, delay: 3 }] },
];

/* Generatore di ondate infinite (n = numero ondata, > storyWaves) */
function generateEndlessWave(n, bossType) {
  const k = n - CONFIG.storyWaves;          // 1, 2, 3…
  const pool = ["ananas", "ketchup", "cappuccino", "influencer", "turista"];
  const groups = [];
  const nGroups = 2 + Math.min(3, Math.floor(k / 2));
  for (let i = 0; i < nGroups; i++) {
    const type = pool[(k * 3 + i * 2) % pool.length];
    const base = { ananas: 14, ketchup: 14, cappuccino: 7, influencer: 8, turista: 3 }[type];
    groups.push({ type, count: base + Math.floor(k * 2), interval: type === "turista" ? 1.8 : 0.45, delay: i === 0 ? 0 : 2 });
  }
  if (k % CONFIG.endless.bossEvery === 0) {
    const bosses = ["carbonara", "ananasgigante"];
    const count = 1 + Math.floor(k / (CONFIG.endless.bossEvery * 2));
    groups.push({ type: bosses[(k / CONFIG.endless.bossEvery) % 2] || bossType, count, interval: 3, delay: 3 });
  }
  return { groups };
}
