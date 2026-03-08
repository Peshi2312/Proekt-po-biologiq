// game.js
// Main loop and systems for the "Clean the Ocean" game.

import {
  PlayerFish,
  TrashItem,
  PollutionCloud,
  MarineAnimal,
  circleCollision,
} from "./entities.js";

const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

const scoreEl = document.getElementById("scoreValue");
const healthFillEl = document.getElementById("healthFill");
const healthPercentEl = document.getElementById("healthPercent");

const startScreen = document.getElementById("startScreen");
const gameOverScreen = document.getElementById("gameOverScreen");
const startButton = document.getElementById("startButton");
const restartButton = document.getElementById("restartButton");
const finalScoreValue = document.getElementById("finalScoreValue");

const input = {
  up: false,
  down: false,
  left: false,
  right: false,
  mouseActive: false,
  mouseX: canvas.width / 2,
  mouseY: canvas.height / 2,
};

let player;
let trashItems = [];
let pollutionClouds = [];
let animals = [];
let score = 0;
let oceanHealth = 60;
let pollutionLevel = 40; // abstract pollution index (0-100)
let elapsed = 0;
let lastTime = 0;
let gameState = "start"; // 'start' | 'playing' | 'gameover'

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
  score = 0;
  oceanHealth = 60;
  pollutionLevel = 40;
  elapsed = 0;
  spawnInitialEntities();
  updateHUD();
}

function spawnInitialEntities() {
  for (let i = 0; i < 18; i++) spawnTrash();
  for (let i = 0; i < 6; i++) spawnPollutionCloud();
  for (let i = 0; i < 10; i++) spawnAnimal();
}

function spawnTrash() {
  const padding = 40;
  const x = padding + Math.random() * (canvas.width - padding * 2);
  const y = padding + Math.random() * (canvas.height - padding * 2);
  const kinds = ["bottle", "bag", "can", "net"];
  const kind = kinds[Math.floor(Math.random() * kinds.length)];
  trashItems.push(new TrashItem(x, y, kind));
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
  // Trash spawn increases over time
  if (Math.random() < 0.5 * dt) {
    spawnTrash();
  }

  // Occasionally spawn new pollution clouds, more often as pollution rises
  const pollutionSpawnChance = 0.05 + pollutionLevel / 4000;
  if (Math.random() < pollutionSpawnChance * dt) {
    spawnPollutionCloud();
  }

  // Pollution slowly rises based on number of clouds
  pollutionLevel += pollutionClouds.length * 0.01;

  // Ocean health responds to score and pollution
  const cleanBonus = score * 0.0005;
  const pollutionPenalty = pollutionLevel * 0.003;
  oceanHealth += (cleanBonus - pollutionPenalty) * dt * 60;

  // Extra penalty if clouds are many
  if (pollutionClouds.length > 18) {
    oceanHealth -= (pollutionClouds.length - 18) * 0.03 * (dt * 60);
  }

  if (oceanHealth <= 0) {
    endGame();
  }
}

function endGame() {
  if (gameState === "gameover") return;
  gameState = "gameover";
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
  player.update(dt, input, canvas.width, canvas.height);

  trashItems.forEach((item) => {
    // slight drifting is baked into drawing; no movement needed
  });

  pollutionClouds.forEach((cloud) => cloud.update(dt, canvas.width, canvas.height));
  animals.forEach((a) => a.update(dt, canvas.width, canvas.height));

  // Trash collection
  for (let i = trashItems.length - 1; i >= 0; i--) {
    const item = trashItems[i];
    if (circleCollision(player.pos, player.radius, item.pos, item.radius)) {
      trashItems.splice(i, 1);
      score += 10;
      oceanHealth += 2.5;
      pollutionLevel -= 1.2;
    }
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
    oceanHealth -= 12 * dt;
    pollutionLevel += 10 * dt;
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

startButton.addEventListener("click", () => {
  startScreen.classList.add("hidden");
  gameOverScreen.classList.add("hidden");
  resetGame();
  gameState = "playing";
});

restartButton.addEventListener("click", () => {
  gameOverScreen.classList.add("hidden");
  resetGame();
  gameState = "playing";
});

// Initial render and loop
resetGame();
render(0);
requestAnimationFrame(step);

