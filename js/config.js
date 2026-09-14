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
};

/* Mappa: waypoint in coordinate di cella (col, row).
   Il primo e l'ultimo sono fuori dallo schermo (entrata dalla porta,
   uscita verso la sala). */
const MAP = {
  name: "La Trattoria",
  waypoints: [
    [-1, 1], [3, 1], [3, 5], [8, 5], [8, 2], [12, 2], [12, 7], [16, 7],
  ],
  // celle decorative non edificabili (fornelli, frigo…)
  blocked: [
    [0, 8], [1, 8], [0, 9], [1, 9],   // frigo
    [14, 0], [15, 0],                 // fornelli
  ],
  decorations: [
    { col: 0.5, row: 8.5, emoji: "🧊", size: 26 },
    { col: 1.5, row: 8.5, emoji: "🥬", size: 22 },
    { col: 0.5, row: 9.5, emoji: "🍅", size: 22 },
    { col: 1.5, row: 9.5, emoji: "🧀", size: 22 },
    { col: 14.5, row: 0.5, emoji: "🔥", size: 24 },
    { col: 15.5, row: 0.5, emoji: "🍳", size: 24 },
  ],
};

/* Torri (la brigata). Ogni livello sovrascrive i valori del precedente. */
const TOWERS = {
  pizzaiolo: {
    name: "Pizzaiolo",
    emoji: "🍕",
    projectileEmoji: "🍕",
    desc: "Lancia pizze. Equilibrato.",
    cost: 60,
    levels: [
      { dmg: 12, range: 115, rate: 1.2, projSpeed: 280 },
      { dmg: 20, range: 130, rate: 1.3, projSpeed: 300, cost: 50 },
      { dmg: 36, range: 140, rate: 1.5, projSpeed: 320, cost: 90 },
    ],
  },
  nonna: {
    name: "Nonna",
    emoji: "👵",
    projectileEmoji: "🥖",
    desc: "Mattarellate ad area. Corta gittata.",
    cost: 80,
    levels: [
      { dmg: 30, range: 75, rate: 0.6, projSpeed: 220, splash: 45 },
      { dmg: 50, range: 85, rate: 0.65, projSpeed: 220, splash: 50, cost: 70 },
      { dmg: 85, range: 95, rate: 0.7, projSpeed: 240, splash: 60, cost: 120 },
    ],
  },
  gelataio: {
    name: "Gelataio",
    emoji: "🍦",
    projectileEmoji: "🧊",
    desc: "Granita: rallenta i nemici.",
    cost: 75,
    levels: [
      { dmg: 4, range: 100, rate: 0.8, projSpeed: 240, slow: 0.5, slowTime: 1.5 },
      { dmg: 6, range: 110, rate: 0.9, projSpeed: 240, slow: 0.6, slowTime: 2.0, cost: 60 },
      { dmg: 10, range: 125, rate: 1.0, projSpeed: 260, slow: 0.65, slowTime: 2.5, cost: 100 },
    ],
  },
  sommelier: {
    name: "Sommelier",
    emoji: "🍷",
    projectileEmoji: "🍾",
    desc: "Tappi a lunga gittata. Lento, letale.",
    cost: 100,
    levels: [
      { dmg: 50, range: 170, rate: 0.35, projSpeed: 420 },
      { dmg: 90, range: 185, rate: 0.4, projSpeed: 440, cost: 100 },
      { dmg: 160, range: 200, rate: 0.45, projSpeed: 460, cost: 160 },
    ],
  },
};

/* Nemici (i clienti sgraditi). armor = danno sottratto a ogni colpo. */
const ENEMIES = {
  ananas: {
    name: "Ananas sulla pizza",
    emoji: "🍍",
    hp: 30, speed: 55, reward: 6, armor: 0, livesCost: 1, size: 22,
  },
  ketchup: {
    name: "Ketchup sulla pasta",
    emoji: "🥫",
    hp: 18, speed: 110, reward: 6, armor: 0, livesCost: 1, size: 20,
  },
  cappuccino: {
    name: "Cappuccino dopo pranzo",
    emoji: "☕",
    hp: 110, speed: 40, reward: 14, armor: 2, livesCost: 2, size: 24,
  },
  carbonara: {
    name: "Carbonara con la panna",
    emoji: "🍝",
    hp: 800, speed: 32, reward: 120, armor: 4, livesCost: 5, size: 32, boss: true,
  },
};

/* Ondate: gruppi in sequenza. interval = secondi tra uno spawn e l'altro,
   delay = secondi di attesa prima che il gruppo inizi (dopo il precedente). */
const WAVES = [
  { groups: [{ type: "ananas", count: 6, interval: 1.5 }] },
  { groups: [{ type: "ananas", count: 8, interval: 1.2 }, { type: "ketchup", count: 3, interval: 0.8, delay: 2 }] },
  { groups: [{ type: "ketchup", count: 12, interval: 0.5 }] },
  { groups: [{ type: "ananas", count: 8, interval: 0.8 }, { type: "cappuccino", count: 3, interval: 2.0, delay: 3 }] },
  { groups: [{ type: "cappuccino", count: 6, interval: 1.6 }, { type: "ketchup", count: 8, interval: 0.4, delay: 4 }] },
  { groups: [{ type: "ananas", count: 20, interval: 0.5 }] },
  { groups: [{ type: "ketchup", count: 15, interval: 0.35 }, { type: "cappuccino", count: 5, interval: 1.4, delay: 2 }] },
  { groups: [{ type: "cappuccino", count: 10, interval: 1.2 }, { type: "ananas", count: 12, interval: 0.6, delay: 3 }] },
  { groups: [{ type: "ananas", count: 15, interval: 0.5 }, { type: "ketchup", count: 15, interval: 0.3, delay: 2 }, { type: "cappuccino", count: 8, interval: 1.0, delay: 3 }] },
  { groups: [{ type: "ketchup", count: 10, interval: 0.4 }, { type: "carbonara", count: 1, interval: 1, delay: 4 }, { type: "ketchup", count: 10, interval: 0.3, delay: 1 }, { type: "cappuccino", count: 6, interval: 1.2, delay: 3 }] },
];
