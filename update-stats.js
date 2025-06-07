// update-stats.js
const fs   = require("fs");
const path = require("path");

// Twoja tablica prawdopodobieństw i zmian
const DIST = [
  [0.35, +0.0196,  +1],
  [0.55, +0.0473,  +2],
  [0.60, +0.0994,  +5],
  [0.65, +0.1518,  +8],
  [0.70, +0.1973, +10],
  [0.90, -0.0121,  -1],
  [1.00, -0.0305,  -2]
];

function loadStats() {
  const raw = fs.readFileSync(path.join(__dirname, "stats.json"), "utf8");
  return JSON.parse(raw);
}

function saveStats(stats) {
  fs.writeFileSync(
    path.join(__dirname, "stats.json"),
    JSON.stringify(stats, null, 2)
  );
}

function tick(stats) {
  const r = Math.random();
  for (const [p, dEth, dUsers] of DIST) {
    if (r <= p) {
      stats.ethCount  = Math.max(0, stats.ethCount + dEth);
      stats.userCount = Math.max(0, stats.userCount + dUsers);
      break;
    }
  }
}

function main() {
  const stats = loadStats();
  tick(stats);
  saveStats(stats);
}

main();



