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

const statMoves = document.getElementById("stat-moves");
const statTime = document.getElementById("stat-time");
const statSpeed = document.getElementById("stat-speed");

function updateStats() {
  if (!startTime) return;
  const elapsed = (Date.now() - startTime) / 1000;
  if (statMoves) statMoves.textContent = totalMove;
  if (statTime) statTime.textContent = elapsed.toFixed(1) + "s";
  if (statSpeed) statSpeed.textContent = (elapsed > 0 ? (totalMove / elapsed).toFixed(0) : "0") + " m/s";
}

const githubModal = document.getElementById("github-modal");
const githubModalOverlay = document.getElementById("github-modal-overlay");
const closeGithubModalButton = document.getElementById("close-github-modal");

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
  if (event.key === "Escape") {
    hideGithubFollowPrompt();
  }
});

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
      if (game.over) {
        stopAI();
      }
      if (game.won) {
        showGithubFollowPrompt();
        game.keepPlaying = true;
        game.actuator.clearMessage();
      }
      if (aiRunning) step();
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

document.querySelector("#ai-step").addEventListener('click', () => step())
document.querySelector("#ai-start").addEventListener('click', () => toggleAI())

// Keyboard shortcuts: Space = toggle AI, S = one step, N = new game
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
        });
      }
      break;
  }
});

// Add GitHub follow prompt after the game's retry functionality
const retryButton = document.querySelector('.retry-button');
const originalClick = retryButton.onclick;
retryButton.onclick = function(e) {
  // Call the original handler first
  if (originalClick) originalClick.call(this, e);
  
  // Then show GitHub prompt if the game was over
  if (game.over) {
    // Small delay to ensure game has restarted
    setTimeout(showGithubFollowPrompt, 50);
  }
};
