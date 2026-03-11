// game.js
// Main loop and systems for the "Clean the Ocean" game.

import {
  PlayerFish,
  TrashItem,
  GoldenApple,
  PollutionCloud,
  MarineAnimal,
  Bomb,
  circleCollision,
} from "./entities.js";

const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

const scoreEl = document.getElementById("scoreValue");
const healthFillEl = document.getElementById("healthFill");
const healthPercentEl = document.getElementById("healthPercent");

const startScreen = document.getElementById("startScreen");
const gameOverScreen = document.getElementById("gameOverScreen");
const level1Button = document.getElementById("level1Button");
const level2Button = document.getElementById("level2Button");
const level3Button = document.getElementById("level3Button");
const restartButton = document.getElementById("restartButton");
const nextLevelButton = document.getElementById("nextLevelButton");
const menuButton = document.getElementById("menuButton");
const finalScoreValue = document.getElementById("finalScoreValue");
const gameOverMessageEl = document.getElementById("gameOverMessage");
const gameOverTitleEl = document.getElementById("gameOverTitle");

const DEFAULT_GAME_OVER_TITLE = "Ocean Overwhelmed";
const DEFAULT_GAME_OVER_MESSAGE =
  "Pollution has become too strong and the ocean health has collapsed.";
const DEFAULT_RESTART_BUTTON_TEXT = "Try Again";

const LEVEL_CONFIG = {
  1: {
    // Level 1: health drains slowly, but doesn't ramp up too fast
    baselineRecovery: 0.06,
    cleanBonusFactor: 0.0003,
    pollutionPenaltyFactor: 0.00105,
    extraCloudPenaltyFactor: 0.004,
    inCloudDamagePerSecond: 1.4,
    trashSpawnMultiplier: 0.9,
  },
  2: {
    baselineRecovery: 0.03,
    cleanBonusFactor: 0.0005,
    pollutionPenaltyFactor: 0.0022,
    extraCloudPenaltyFactor: 0.0105,
    inCloudDamagePerSecond: 3.2,
    trashSpawnMultiplier: 1.0,
  },
  3: {
    baselineRecovery: 0.01,
    cleanBonusFactor: 0.00055,
    pollutionPenaltyFactor: 0.0025,
    extraCloudPenaltyFactor: 0.0125,
    inCloudDamagePerSecond: 3.7,
    trashSpawnMultiplier: 1.25,
  },
};

function clampLevel(level) {
  return level === 1 || level === 2 || level === 3 ? level : 2;
}

const trashImages = {};

function loadImages() {
  trashImages.bottle = new Image();
  trashImages.bottle.src =
    "b032900de06e5a0e4b8c94343318e2cb-plastic-bottle-garbage.webp";
  trashImages.bag1 = new Image();
  // File in repo is named "plastic-bag-cartoon-clipart.png"
  trashImages.bag1.src = "plastic-bag-cartoon-clipart.png";
  trashImages.bag2 = new Image();
  trashImages.bag2.src =
    "5f42a47ed6838d65656704271346a83c-green-garbage-bag.webp";
}

loadImages();

const input = {
  up: false,
  down: false,
  left: false,
  right: false,
  mouseActive: false,
  mouseX: canvas.width / 2,
  mouseY: canvas.height / 2,
};

// Resize canvas to match display size
function resizeCanvas() {
  const rect = canvas.getBoundingClientRect();
  canvas.width = rect.width;
  canvas.height = rect.height;
}

// Initial resize
resizeCanvas();

// Resize on window resize
window.addEventListener('resize', resizeCanvas);

let player;
let trashItems = [];
let pollutionClouds = [];
let animals = [];
let bombs = [];
let bombSpawnTimer = 0;
let goldenApple = null;
let goldenAppleSpawnTimer = 0;
let score = 0;
let oceanHealth = 60;
let pollutionLevel = 40; // abstract pollution index (0-100)
let elapsed = 0;
let lastTime = 0;
let gameState = "start"; // 'start' | 'playing' | 'gameover'
let currentLevel = 2;

// ---------------------------------------------
// Input handling
// ---------------------------------------------

window.addEventListener("keydown", (e) => {
  const k = e.key.toLowerCase();
  if (k === "w" || k === "arrowup") input.up = true;
  if (k === "s" || k === "arrowdown") input.down = true;
  if (k === "a" || k === "arrowleft") input.left = true;
  if (k === "d" || k === "arrowright") input.right = true;
});

window.addEventListener("keyup", (e) => {
  const k = e.key.toLowerCase();
  if (k === "w" || k === "arrowup") input.up = false;
  if (k === "s" || k === "arrowdown") input.down = false;
  if (k === "a" || k === "arrowleft") input.left = false;
  if (k === "d" || k === "arrowright") input.right = false;
});

canvas.addEventListener("mousemove", (e) => {
  const rect = canvas.getBoundingClientRect();
  input.mouseX = e.clientX - rect.left;
  input.mouseY = e.clientY - rect.top;
  input.mouseActive = true;
});

canvas.addEventListener("mouseleave", () => {
  input.mouseActive = false;
});

// Touch events for mobile
canvas.addEventListener("touchstart", (e) => {
  e.preventDefault();
  const rect = canvas.getBoundingClientRect();
  const touch = e.touches[0];
  input.mouseX = touch.clientX - rect.left;
  input.mouseY = touch.clientY - rect.top;
  input.mouseActive = true;
});

canvas.addEventListener("touchmove", (e) => {
  e.preventDefault();
  const rect = canvas.getBoundingClientRect();
  const touch = e.touches[0];
  input.mouseX = touch.clientX - rect.left;
  input.mouseY = touch.clientY - rect.top;
  input.mouseActive = true;
});

canvas.addEventListener("touchend", (e) => {
  e.preventDefault();
  input.mouseActive = false;
});

// ---------------------------------------------
// Game setup / reset
// ---------------------------------------------

function resetGame() {
  const cx = canvas.width / 2;
  const cy = canvas.height / 2;
  player = new PlayerFish(cx, cy);
  trashItems = [];
  pollutionClouds = [];
  animals = [];
  bombs = [];
  bombSpawnTimer = Math.random() * 2 + 1; // Random initial spawn time between 1-3 seconds (much earlier)
  goldenApple = null;
  goldenAppleSpawnTimer = 8 + Math.random() * 12; // first spawn after ~8-20s
  score = 0;
  oceanHealth = 60;
  pollutionLevel = 40;
  elapsed = 0;
  if (gameOverTitleEl) gameOverTitleEl.textContent = DEFAULT_GAME_OVER_TITLE;
  if (gameOverMessageEl) gameOverMessageEl.textContent = DEFAULT_GAME_OVER_MESSAGE;
  if (restartButton) restartButton.textContent = DEFAULT_RESTART_BUTTON_TEXT;
  if (nextLevelButton) nextLevelButton.classList.add("hidden");
  spawnInitialEntities();
  updateHUD();
}

function startGame(level) {
  currentLevel = clampLevel(level);
  startScreen.classList.add("hidden");
  gameOverScreen.classList.add("hidden");
  resetGame();
  gameState = "playing";
}

function showMainMenu() {
  gameOverScreen.classList.add("hidden");
  startScreen.classList.remove("hidden");
  gameState = "start";
}

function spawnInitialEntities() {
  for (let i = 0; i < 24; i++) spawnTrash();
  for (let i = 0; i < 6; i++) spawnPollutionCloud();
  for (let i = 0; i < 10; i++) spawnAnimal();
  // No initial bombs - they spawn randomly over time
}

function spawnTrash() {
  const padding = 40;
  const x = padding + Math.random() * (canvas.width - padding * 2);
  const y = padding + Math.random() * (canvas.height - padding * 2);
  // "bottle", "bag1", and "bag2" are image-based trash items.
  const kinds = ["bottle", "bag1", "bag2", "can", "net"];
  const kind = kinds[Math.floor(Math.random() * kinds.length)];
  const image = trashImages[kind] ?? null;
  trashItems.push(new TrashItem(x, y, kind, image));
}

function spawnPollutionCloud() {
  const padding = 80;
  const x = padding + Math.random() * (canvas.width - padding * 2);
  const y = padding + Math.random() * (canvas.height - padding * 2);
  pollutionClouds.push(new PollutionCloud(x, y));
}

function spawnAnimal() {
  const padding = 40;
  const x = padding + Math.random() * (canvas.width - padding * 2);
  const y = padding + Math.random() * (canvas.height - padding * 2);
  const kinds = ["fish", "turtle", "crab"];
  const kind = kinds[Math.floor(Math.random() * kinds.length)];
  animals.push(new MarineAnimal(x, y, kind));
}

function spawnBomb() {
  const padding = 60;
  const x = padding + Math.random() * (canvas.width - padding * 2);
  const y = padding + Math.random() * (canvas.height - padding * 2);
  bombs.push(new Bomb(x, y));
}

function spawnGoldenApple() {
  const padding = 60;
  const x = padding + Math.random() * (canvas.width - padding * 2);
  const y = padding + Math.random() * (canvas.height - padding * 2);
  goldenApple = new GoldenApple(x, y);
}

// ---------------------------------------------
// HUD and state updates
// ---------------------------------------------

function updateHUD() {
  scoreEl.textContent = score.toString();
  oceanHealth = clamp(oceanHealth, 0, 100);
  healthFillEl.style.width = `${oceanHealth}%`;
  healthPercentEl.textContent = `${Math.round(oceanHealth)}%`;
}

function updateSystems(dt) {
  const levelCfg = LEVEL_CONFIG[currentLevel] ?? LEVEL_CONFIG[2];

  // Trash spawn (rate is "items per second").
  // and ramps up slowly as the round goes on.
  const trashSpawnRate =
    (0.75 + Math.min(1.05, elapsed * 0.018)) * levelCfg.trashSpawnMultiplier;
  if (Math.random() < trashSpawnRate * dt) spawnTrash();
  // Small chance to spawn an extra piece for "bursts"
  if (Math.random() < trashSpawnRate * 0.12 * dt) spawnTrash();

  // Occasionally spawn new pollution clouds, more often as pollution rises
  const pollutionSpawnChance = 0.04 + pollutionLevel / 10000;
  if (Math.random() < pollutionSpawnChance * dt) {
    spawnPollutionCloud();
  }

  // Handle bomb spawning timer
  bombSpawnTimer -= dt;
  if (bombSpawnTimer <= 0) {
    spawnBomb();
    bombSpawnTimer = Math.random() * 2 + 1; // Next bomb spawns in 1-3 seconds (more frequent)
  }

  // Golden apple spawns at random times (one at a time)
  if (!goldenApple) {
    goldenAppleSpawnTimer -= dt;
    if (goldenAppleSpawnTimer <= 0) {
      spawnGoldenApple();
      goldenAppleSpawnTimer = 12 + Math.random() * 18; // next spawn after ~12-30s
    }
  }

  // Pollution slowly rises based on number of clouds
  pollutionLevel += pollutionClouds.length * 0.005; // Reduced from 0.01

  // Ocean health responds to score and pollution
  const baselineRecovery = levelCfg.baselineRecovery;
  const cleanBonus = score * levelCfg.cleanBonusFactor;
  const pollutionPenalty = pollutionLevel * levelCfg.pollutionPenaltyFactor;
  oceanHealth += (baselineRecovery + cleanBonus - pollutionPenalty) * dt * 60;

  // Extra penalty if clouds are many
  if (pollutionClouds.length > 18) {
    oceanHealth -=
      (pollutionClouds.length - 18) * levelCfg.extraCloudPenaltyFactor * (dt * 60);
  }

  // Win condition: ocean health reaches 100%
  if (oceanHealth >= 100) {
    winGame();
  }

  if (oceanHealth <= 0) endGame();
}

function endGame(message = DEFAULT_GAME_OVER_MESSAGE) {
  if (gameState === "gameover") return;
  gameState = "gameover";
  if (gameOverTitleEl) gameOverTitleEl.textContent = DEFAULT_GAME_OVER_TITLE;
  if (restartButton) restartButton.textContent = DEFAULT_RESTART_BUTTON_TEXT;
  if (nextLevelButton) nextLevelButton.classList.add("hidden");
  if (gameOverMessageEl) gameOverMessageEl.textContent = message;
  finalScoreValue.textContent = score.toString();
  gameOverScreen.classList.remove("hidden");
}

function winGame() {
  if (gameState !== "playing") return;
  gameState = "gameover";
  if (gameOverTitleEl) gameOverTitleEl.textContent = "Ocean Restored!";
  if (restartButton) restartButton.textContent = "Play Again";
  if (gameOverMessageEl) gameOverMessageEl.textContent = "You restored the ocean. Great job!";
  if (nextLevelButton) {
    if (currentLevel < 3) {
      nextLevelButton.textContent = "Next Level";
      nextLevelButton.classList.remove("hidden");
    } else {
      nextLevelButton.classList.add("hidden");
    }
  }
  finalScoreValue.textContent = score.toString();
  gameOverScreen.classList.remove("hidden");
}

// ---------------------------------------------
// Rendering
// ---------------------------------------------

function drawBackground(time) {
  const healthFactor = oceanHealth / 100;
  // Interpolate water colors between polluted and clean
  const pollutedTop = { r: 5, g: 20, b: 30 };
  const cleanTop = { r: 30, g: 130, b: 190 };
  const pollutedBottom = { r: 1, g: 6, b: 12 };
  const cleanBottom = { r: 4, g: 40, b: 70 };

  const top = mixColor(pollutedTop, cleanTop, healthFactor);
  const bottom = mixColor(pollutedBottom, cleanBottom, healthFactor);

  const grd = ctx.createLinearGradient(0, 0, 0, canvas.height);
  grd.addColorStop(0, top);
  grd.addColorStop(1, bottom);

  ctx.fillStyle = grd;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Bubbles / particles
  ctx.fillStyle = `rgba(255, 255, 255, ${0.06 + healthFactor * 0.08})`;
  for (let i = 0; i < 40; i++) {
    const x = ((i * 73) % canvas.width) + Math.sin(time * 0.5 + i) * 4;
    const base = (i * 97) % canvas.height;
    const y = (base + (time * 40) % canvas.height) % canvas.height;
    ctx.beginPath();
    ctx.arc(x, y, 1.3 + (i % 3) * 0.3, 0, Math.PI * 2);
    ctx.fill();
  }

  // Corals appear as health improves
  if (healthFactor > 0.4) {
    const coralCount = Math.round(5 + healthFactor * 8);
    for (let i = 0; i < coralCount; i++) {
      const x = (i * 150 + 40) % canvas.width;
      const y = canvas.height - 12;
      drawCoral(x, y, healthFactor);
    }
  }
}

function drawCoral(x, y, healthFactor) {
  const height = 14 + healthFactor * 10;
  ctx.save();
  ctx.translate(x, y);
  ctx.strokeStyle = `rgba(${180 + healthFactor * 60}, ${80 + healthFactor * 40}, ${
    160 + healthFactor * 60
  }, 0.9)`;
  ctx.lineWidth = 3;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(-3, -height * 0.8);
  ctx.moveTo(0, 0);
  ctx.lineTo(3, -height);
  ctx.moveTo(0, -height * 0.5);
  ctx.lineTo(6, -height * 0.8);
  ctx.stroke();
  ctx.restore();
}

// ---------------------------------------------
// Main loop
// ---------------------------------------------

function step(timestamp) {
  const t = timestamp / 1000;
  const dt = Math.min(0.05, t - lastTime || 0);
  lastTime = t;
  elapsed += dt;

  if (gameState === "playing") {
    update(dt, t);
    render(t);
  } else if (gameState === "start") {
    render(t);
  } else if (gameState === "gameover") {
    render(t);
  }

  requestAnimationFrame(step);
}

function update(dt, time) {
  const levelCfg = LEVEL_CONFIG[currentLevel] ?? LEVEL_CONFIG[2];
  player.update(dt, input, canvas.width, canvas.height);

  trashItems.forEach((item) => {
    // slight drifting is baked into drawing; no movement needed
  });

  pollutionClouds.forEach((cloud) => cloud.update(dt, canvas.width, canvas.height));
  animals.forEach((a) => a.update(dt, canvas.width, canvas.height));
  
  // Update bombs and remove expired ones
  bombs = bombs.filter((bomb) => !bomb.update(dt, canvas.width, canvas.height));

  // Trash collection
  for (let i = trashItems.length - 1; i >= 0; i--) {
    const item = trashItems[i];
    if (circleCollision(player.pos, player.radius, item.pos, item.radius)) {
      trashItems.splice(i, 1);
      score += 10;
      oceanHealth += 4.5;
      pollutionLevel -= 1.6;
    }
  }

  // Golden apple collection (speed boost)
  if (
    goldenApple &&
    circleCollision(player.pos, player.radius, goldenApple.pos, goldenApple.radius)
  ) {
    goldenApple = null;
    player.speedBoostTime = 9; // seconds
    player.speedBoostMultiplier = 1.8; // a lot faster
  }

  // Pollution collision
  let inCloud = false;
  for (const cloud of pollutionClouds) {
    if (circleCollision(player.pos, player.radius * 0.85, cloud.pos, cloud.radius)) {
      inCloud = true;
      break;
    }
  }
  if (inCloud) {
    oceanHealth -= levelCfg.inCloudDamagePerSecond * dt;
    pollutionLevel += 5 * dt; // Reduced from 10
  }

  // Bomb collision - instant death!
  for (const bomb of bombs) {
    if (circleCollision(player.pos, player.radius, bomb.pos, bomb.radius)) {
      endGame("You've hit a bomb.");
      break;
    }
  }

  pollutionLevel = clamp(pollutionLevel, 0, 100);
  updateSystems(dt);
  updateHUD();
}

function render(time) {
  drawBackground(time);

  // Draw entities
  trashItems.forEach((item) => item.draw(ctx, time));
  pollutionClouds.forEach((cloud) => cloud.draw(ctx, time));
  animals.forEach((a) => a.draw(ctx, time));
  bombs.forEach((bomb) => bomb.draw(ctx, time));
  goldenApple && goldenApple.draw(ctx, time);
  player && player.draw(ctx, oceanHealth / 100);
}

// ---------------------------------------------
// Utility functions
// ---------------------------------------------

function clamp(v, min, max) {
  return Math.min(max, Math.max(min, v));
}

function mixColor(c1, c2, t) {
  const r = Math.round(c1.r + (c2.r - c1.r) * t);
  const g = Math.round(c1.g + (c2.g - c1.g) * t);
  const b = Math.round(c1.b + (c2.b - c1.b) * t);
  return `rgb(${r}, ${g}, ${b})`;
}

// ---------------------------------------------
// Start / restart controls
// ---------------------------------------------

level1Button && level1Button.addEventListener("click", () => startGame(1));
level2Button && level2Button.addEventListener("click", () => startGame(2));
level3Button && level3Button.addEventListener("click", () => startGame(3));

restartButton.addEventListener("click", () => {
  gameOverScreen.classList.add("hidden");
  resetGame();
  gameState = "playing";
});

nextLevelButton &&
  nextLevelButton.addEventListener("click", () => startGame(clampLevel(currentLevel + 1)));

menuButton && menuButton.addEventListener("click", () => showMainMenu());

// Initial render and loop
resetGame();
render(0);
requestAnimationFrame(step);

