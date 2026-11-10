const codes = require('../data/codes.json');
const prizes = require('../data/prizes.json');

// 31.12.2026, 15:00 по Москве
const DRAW_TIME = new Date('2026-12-31T15:00:00+03:00');

// Сид задаётся переменной окружения DRAW_SEED в Vercel.
// Перед реальным розыгрышем замени на случайную строку.
const SEED = process.env.DRAW_SEED || 'dev-seed';

// Простой детерминированный PRNG (mulberry32)
function mulberry32(a) {
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Строка -> число (FNV-1a)
function stringToSeed(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

// Fisher–Yates
function shuffle(arr, rng) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

let cachedResults = null;

function computeResults() {
  if (cachedResults) return cachedResults;

  const rng = mulberry32(stringToSeed(SEED));
  const shuffled = shuffle(codes, rng);
  const winners = shuffled.slice(0, prizes.length);

  // Призы идут в порядке файла (от младшего к главному),
  // код для каждого приза выбран случайно и без повторов.
  cachedResults = prizes.map((prize, i) => ({
    prize,
    code: winners[i].code,
    name: winners[i].name,
  }));

  return cachedResults;
}

module.exports = (req, res) => {
  res.setHeader('Cache-Control', 'no-store');

  const now = Date.now();
  const base = {
    serverNow: now,
    drawTime: DRAW_TIME.toISOString(),
    prizes,
    participantsCount: codes.length,
  };

  if (now < DRAW_TIME.getTime()) {
    res.status(200).json({
      ...base,
      started: false,
      msRemaining: DRAW_TIME.getTime() - now,
    });
    return;
  }

  res.status(200).json({
    ...base,
    started: true,
    results: computeResults(),
  });
};