import {GameManager} from "./vendor/2048.min.js"

let game;
window.requestAnimationFrame(() => {
  game = new GameManager(4);
});

let aiRunning = false;

const workers = [
  new Worker("ai.js"),
  new Worker("ai.js"),
  new Worker("ai.js"),
  new Worker("ai.js")
];

let working = 0;
let bestMove, bestResult;
let startTime, totalMove;
let githubModalShown = false;
let statsInterval = null;
let aiDelay = 0;
let sessionBestTile = 0;

// ============================
// DOM References
// ============================
const statMoves = document.getElementById("stat-moves");
const statTime = document.getElementById("stat-time");
const statSpeed = document.getElementById("stat-speed");
const statBestTile = document.getElementById("stat-best-tile");
const speedSlider = document.getElementById("speed-slider");
const speedValueLabel = document.getElementById("speed-value");
const githubModal = document.getElementById("github-modal");
const githubModalOverlay = document.getElementById("github-modal-overlay");
const closeGithubModalButton = document.getElementById("close-github-modal");

// ============================
// Stats Update
// ============================
function updateStats() {
  if (!startTime) return;
  const elapsed = (Date.now() - startTime) / 1000;
  if (statMoves) statMoves.textContent = totalMove;
  if (statTime) statTime.textContent = elapsed.toFixed(1) + "s";
  if (statSpeed) statSpeed.textContent = (elapsed > 0 ? (totalMove / elapsed).toFixed(0) : "0") + " m/s";
}

function getHighestTile() {
  let max = 0;
  if (!game || !game.grid) return max;
  for (let i = 0; i < 4; i++) {
    for (let j = 0; j < 4; j++) {
      const tile = game.grid.cells[i][j];
      if (tile && tile.value > max) max = tile.value;
    }
  }
  return max;
}

function updateBestTile() {
  const highest = getHighestTile();
  if (highest > sessionBestTile) {
    sessionBestTile = highest;
    // Persist all-time best
    const allTimeBest = parseInt(localStorage.getItem("2048-best-tile") || "0");
    if (sessionBestTile > allTimeBest) {
      localStorage.setItem("2048-best-tile", sessionBestTile);
    }
  }
  if (statBestTile) statBestTile.textContent = sessionBestTile;
}

// Load persisted best tile
sessionBestTile = parseInt(localStorage.getItem("2048-best-tile") || "0");
if (statBestTile) statBestTile.textContent = sessionBestTile || "0";

// ============================
// Speed Slider
// ============================
if (speedSlider) {
  speedSlider.addEventListener("input", () => {
    aiDelay = parseInt(speedSlider.value);
    if (speedValueLabel) speedValueLabel.textContent = aiDelay + "ms";
  });
}

// ============================
// Sound Effects (Web Audio API)
// ============================
let soundEnabled = localStorage.getItem("2048-sound") !== "off";
const soundToggle = document.getElementById("sound-toggle");
if (soundToggle) soundToggle.textContent = soundEnabled ? "🔊" : "🔇";

let audioCtx = null;
function getAudioCtx() {
  if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  return audioCtx;
}

function playMergeSound() {
  if (!soundEnabled) return;
  try {
    const ctx = getAudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(520, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(780, ctx.currentTime + 0.06);
    gain.gain.setValueAtTime(0.12, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.15);
  } catch (_) {}
}

function playMilestoneSound() {
  if (!soundEnabled) return;
  try {
    const ctx = getAudioCtx();
    const notes = [523.25, 659.25, 783.99, 1046.5];
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "triangle";
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.1, ctx.currentTime + i * 0.1);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.1 + 0.3);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(ctx.currentTime + i * 0.1);
      osc.stop(ctx.currentTime + i * 0.1 + 0.3);
    });
  } catch (_) {}
}

if (soundToggle) {
  soundToggle.addEventListener("click", () => {
    soundEnabled = !soundEnabled;
    soundToggle.textContent = soundEnabled ? "🔊" : "🔇";
    localStorage.setItem("2048-sound", soundEnabled ? "on" : "off");
  });
}

// ============================
// Confetti System
// ============================
const confettiCanvas = document.getElementById("confetti-canvas");
const confettiCtx = confettiCanvas ? confettiCanvas.getContext("2d") : null;
let confettiParticles = [];
let confettiAnimId = null;

function resizeConfetti() {
  if (!confettiCanvas) return;
  confettiCanvas.width = window.innerWidth;
  confettiCanvas.height = window.innerHeight;
}
resizeConfetti();
window.addEventListener("resize", resizeConfetti);

function launchConfetti() {
  if (!confettiCtx) return;
  const colors = ["#ff7b89", "#ffb86b", "#6c63ff", "#a0f3ff", "#f9f871", "#ff5eef", "#5dff8b"];
  for (let i = 0; i < 120; i++) {
    confettiParticles.push({
      x: Math.random() * confettiCanvas.width,
      y: -10 - Math.random() * 40,
      w: 6 + Math.random() * 6,
      h: 4 + Math.random() * 4,
      vx: (Math.random() - 0.5) * 6,
      vy: 2 + Math.random() * 4,
      rot: Math.random() * 360,
      rotV: (Math.random() - 0.5) * 12,
      color: colors[Math.floor(Math.random() * colors.length)],
      life: 1
    });
  }
  if (!confettiAnimId) animateConfetti();
}

function animateConfetti() {
  if (!confettiCtx) return;
  confettiCtx.clearRect(0, 0, confettiCanvas.width, confettiCanvas.height);
  confettiParticles.forEach(p => {
    p.x += p.vx;
    p.y += p.vy;
    p.vy += 0.08;
    p.rot += p.rotV;
    p.life -= 0.006;
    confettiCtx.save();
    confettiCtx.translate(p.x, p.y);
    confettiCtx.rotate(p.rot * Math.PI / 180);
    confettiCtx.globalAlpha = Math.max(0, p.life);
    confettiCtx.fillStyle = p.color;
    confettiCtx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
    confettiCtx.restore();
  });
  confettiParticles = confettiParticles.filter(p => p.life > 0 && p.y < confettiCanvas.height + 20);
  if (confettiParticles.length > 0) {
    confettiAnimId = requestAnimationFrame(animateConfetti);
  } else {
    confettiAnimId = null;
    confettiCtx.clearRect(0, 0, confettiCanvas.width, confettiCanvas.height);
  }
}

// Track which milestone tiles have already triggered confetti
let milestoneFired = new Set();

function checkMilestone() {
  const highest = getHighestTile();
  const milestones = [2048, 4096, 8192, 16384, 32768];
  for (const m of milestones) {
    if (highest >= m && !milestoneFired.has(m)) {
      milestoneFired.add(m);
      launchConfetti();
      playMilestoneSound();
    }
  }
}

// ============================
// Background Particles
// ============================
const particlesCanvas = document.getElementById("particles-canvas");
const particlesCtx = particlesCanvas ? particlesCanvas.getContext("2d") : null;
let bgParticles = [];

function resizeParticles() {
  if (!particlesCanvas) return;
  particlesCanvas.width = window.innerWidth;
  particlesCanvas.height = window.innerHeight;
}
resizeParticles();
window.addEventListener("resize", resizeParticles);

function initParticles() {
  bgParticles = [];
  const count = Math.min(60, Math.floor(window.innerWidth * window.innerHeight / 18000));
  for (let i = 0; i < count; i++) {
    bgParticles.push({
      x: Math.random() * particlesCanvas.width,
      y: Math.random() * particlesCanvas.height,
      r: 1 + Math.random() * 2,
      vx: (Math.random() - 0.5) * 0.3,
      vy: (Math.random() - 0.5) * 0.3,
      alpha: 0.15 + Math.random() * 0.35,
      color: Math.random() > 0.5 ? "160,243,255" : "162,105,255"
    });
  }
}

function animateParticles() {
  if (!particlesCtx) return;
  particlesCtx.clearRect(0, 0, particlesCanvas.width, particlesCanvas.height);
  bgParticles.forEach(p => {
    p.x += p.vx;
    p.y += p.vy;
    if (p.x < -10) p.x = particlesCanvas.width + 10;
    if (p.x > particlesCanvas.width + 10) p.x = -10;
    if (p.y < -10) p.y = particlesCanvas.height + 10;
    if (p.y > particlesCanvas.height + 10) p.y = -10;
    particlesCtx.beginPath();
    particlesCtx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
    particlesCtx.fillStyle = `rgba(${p.color},${p.alpha})`;
    particlesCtx.fill();
  });
  requestAnimationFrame(animateParticles);
}

initParticles();
animateParticles();

// ============================
// Game History
// ============================
function loadHistory() {
  try {
    return JSON.parse(localStorage.getItem("2048-history") || "[]");
  } catch { return []; }
}

function saveHistory(entry) {
  const history = loadHistory();
  history.unshift(entry);
  if (history.length > 5) history.length = 5;
  localStorage.setItem("2048-history", JSON.stringify(history));
  renderHistory();
}

function renderHistory() {
  const list = document.getElementById("history-list");
  if (!list) return;
  const history = loadHistory();
  if (history.length === 0) {
    list.innerHTML = '<li class="history-empty">No games played yet</li>';
    return;
  }
  list.innerHTML = history.map(h =>
    `<li class="history-item">
      <span class="history-score">${h.score.toLocaleString()}</span>
      <span class="history-meta">
        <span class="history-tile">${h.bestTile}</span>
        <span>${h.moves}m</span>
        <span>${h.time}</span>
      </span>
    </li>`
  ).join("");
}

renderHistory();

// ============================
// GitHub Follow Modal
// ============================
function showGithubFollowPrompt() {
  if (!githubModal || !githubModalOverlay || githubModalShown) return;
  githubModal.classList.add("visible");
  githubModalOverlay.classList.add("visible");
  githubModal.setAttribute("aria-hidden", "false");
  githubModalOverlay.setAttribute("aria-hidden", "false");
  githubModalShown = true;
}

function hideGithubFollowPrompt() {
  if (!githubModal || !githubModalOverlay) return;
  githubModal.classList.remove("visible");
  githubModalOverlay.classList.remove("visible");
  githubModal.setAttribute("aria-hidden", "true");
  githubModalOverlay.setAttribute("aria-hidden", "true");
}

if (closeGithubModalButton) {
  closeGithubModalButton.addEventListener("click", hideGithubFollowPrompt);
}
if (githubModalOverlay) {
  githubModalOverlay.addEventListener("click", hideGithubFollowPrompt);
}
window.addEventListener("keydown", (event) => {
  if (event.key === "Escape") hideGithubFollowPrompt();
});

// ============================
// AI Core
// ============================
for (let i = 0; i < 4; ++i) {
  workers[i].onmessage = ({data}) => {
    working--;
    if (data > bestResult) {
      bestResult = data;
      bestMove = i;
    }
    if (working == 0) {
      game.move(bestMove);
      totalMove++;
      playMergeSound();
      updateBestTile();
      checkMilestone();
      if (game.over) {
        stopAI();
        // Save game to history
        const elapsed = (Date.now() - startTime) / 1000;
        saveHistory({
          score: game.score,
          bestTile: getHighestTile(),
          moves: totalMove,
          time: elapsed.toFixed(1) + "s"
        });
      }
      if (game.won) {
        showGithubFollowPrompt();
        game.keepPlaying = true;
        game.actuator.clearMessage();
      }
      if (aiRunning) {
        if (aiDelay > 0) {
          setTimeout(step, aiDelay);
        } else {
          step();
        }
      }
    }
  }
}

function currentState() {
  const result = new Uint16Array(4);
  for (let i = 0; i < 4; ++i) {
    for (let j = 0; j < 4; ++j) {
      const tile = game.grid.cells[j][i];
      if (tile) result[i] = result[i] | ((Math.log2(tile.value) & 0xf) << (12 - 4 * j));
    }
  }
  return result;
}

function step() {
  const board = currentState();
  bestResult = 0;
  working = 4;
  bestMove = 0 | 4 * Math.random();
  for (let i = 0; i < 4; ++i) workers[i].postMessage({board, dir: i});
}

function toggleAI() {}

function startAI() {
  totalMove = 0;
  startTime = Date.now();
  milestoneFired.clear();
  document.getElementsByClassName("ai-buttons")[1].textContent = "Stop";
  aiRunning = true;
  step();
  toggleAI = stopAI;
  statsInterval = setInterval(updateStats, 200);
}

function stopAI() {
  const endTime = Date.now();
  console.log(`Time elapsed: ${(endTime - startTime) / 1000} seconds\nMoves taken: ${totalMove} moves\nSpeed: ${totalMove * 1000 / (endTime - startTime)} moves per second`);
  document.getElementsByClassName("ai-buttons")[1].textContent = "Start AI";
  aiRunning = false;
  toggleAI = startAI;
  if (statsInterval) { clearInterval(statsInterval); statsInterval = null; }
  updateStats();
}

toggleAI = startAI;

// ============================
// Button Event Listeners
// ============================
document.querySelector("#ai-step").addEventListener('click', () => step())
document.querySelector("#ai-start").addEventListener('click', () => toggleAI())
document.querySelector("#new-game-btn").addEventListener('click', () => {
  if (aiRunning) stopAI();
  window.requestAnimationFrame(() => {
    game.restart();
    game.actuator.clearMessage();
    if (statMoves) statMoves.textContent = "0";
    if (statTime) statTime.textContent = "0.0s";
    if (statSpeed) statSpeed.textContent = "0 m/s";
    milestoneFired.clear();
  });
});

// ============================
// Keyboard Shortcuts
// ============================
document.addEventListener('keydown', (e) => {
  if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
  switch (e.code) {
    case 'Space':
      e.preventDefault();
      toggleAI();
      break;
    case 'KeyS':
      if (!aiRunning) step();
      break;
    case 'KeyN':
      if (!aiRunning) {
        window.requestAnimationFrame(() => {
          game.restart();
          game.actuator.clearMessage();
          milestoneFired.clear();
        });
      }
      break;
    case 'KeyM':
      if (soundToggle) {
        soundEnabled = !soundEnabled;
        soundToggle.textContent = soundEnabled ? "🔊" : "🔇";
        localStorage.setItem("2048-sound", soundEnabled ? "on" : "off");
      }
      break;
  }
});

// GitHub follow prompt on retry
const retryButton = document.querySelector('.retry-button');
const originalClick = retryButton.onclick;
retryButton.onclick = function(e) {
  if (originalClick) originalClick.call(this, e);
  if (game.over) {
    setTimeout(showGithubFollowPrompt, 50);
  }
};

// ============================
// Theme Toggle
// ============================
const themeToggle = document.getElementById("theme-toggle");
const body = document.body;
const savedTheme = localStorage.getItem("2048-theme");

if (savedTheme === "light") {
  body.classList.add("light-theme");
  if (themeToggle) themeToggle.textContent = "☀️";
}

if (themeToggle) {
  themeToggle.addEventListener("click", () => {
    body.classList.toggle("light-theme");
    const isLight = body.classList.contains("light-theme");
    themeToggle.textContent = isLight ? "☀️" : "🌙";
    localStorage.setItem("2048-theme", isLight ? "light" : "dark");
  });
}
