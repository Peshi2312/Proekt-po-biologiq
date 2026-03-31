// entities.js
// Defines the core entities used in the Clean the Ocean game.

export class Vector2 {
  constructor(x = 0, y = 0) {
    this.x = x;
    this.y = y;
  }

  add(v) {
    this.x += v.x;
    this.y += v.y;
    return this;
  }

  scale(s) {
    this.x *= s;
    this.y *= s;
    return this;
  }

  set(x, y) {
    this.x = x;
    this.y = y;
    return this;
  }

  length() {
    return Math.hypot(this.x, this.y);
  }

  normalize() {
    const len = this.length() || 1;
    this.x /= len;
    this.y /= len;
    return this;
  }

  clone() {
    return new Vector2(this.x, this.y);
  }
}

export class PlayerFish {
  constructor(x, y) {
    this.pos = new Vector2(x, y);
    this.vel = new Vector2(0, 0);
    this.radius = 16;
    this.baseMaxSpeed = 6500; // Increased from 500 for even faster movement
    this.baseAccel = 2400; // Increased from 1000 for even faster acceleration
    this.maxSpeed = this.baseMaxSpeed;
    this.accel = this.baseAccel;
    this.friction = 0.95; // Increased from 0.9 to make slowdown slower (more responsive)
    this.angle = 0; // radians
    this.health = 100;
    this.speedBoostTime = 0;
    this.speedBoostMultiplier = 1;
  }

  update(dt, input, canvasWidth, canvasHeight) {
    if (this.speedBoostTime > 0) {
      this.speedBoostTime = Math.max(0, this.speedBoostTime - dt);
    }
    const boost = this.speedBoostTime > 0 ? this.speedBoostMultiplier : 1;
    this.maxSpeed = this.baseMaxSpeed * boost;
    this.accel = this.baseAccel * boost;

    const dir = new Vector2(0, 0);
    if (input.left) dir.x -= 1;
    if (input.right) dir.x += 1;
    if (input.up) dir.y -= 1;
    if (input.down) dir.y += 1;

    if (dir.x !== 0 || dir.y !== 0) {
      dir.normalize();
      this.vel.x += dir.x * this.accel * dt;
      this.vel.y += dir.y * this.accel * dt;
    } else if (input.mouseActive) {
      // Optional: drift toward mouse
      const toMouse = new Vector2(
        input.mouseX - this.pos.x,
        input.mouseY - this.pos.y,
      );
      if (toMouse.length() > 10) {
        toMouse.normalize();
        this.vel.x += toMouse.x * this.accel * 0.5 * dt;
        this.vel.y += toMouse.y * this.accel * 0.5 * dt;
      }
    }

    // Clamp speed
    const speed = Math.hypot(this.vel.x, this.vel.y);
    if (speed > this.maxSpeed) {
      this.vel.x = (this.vel.x / speed) * this.maxSpeed;
      this.vel.y = (this.vel.y / speed) * this.maxSpeed;
    }

    // Apply friction
    this.vel.x *= this.friction;
    this.vel.y *= this.friction;

    this.pos.x += this.vel.x * dt;
    this.pos.y += this.vel.y * dt;

    // Keep inside canvas
    this.pos.x = clamp(this.pos.x, this.radius, canvasWidth - this.radius);
    this.pos.y = clamp(this.pos.y, this.radius, canvasHeight - this.radius);

    // Rotate toward direction of movement
    if (speed > 10) {
      this.angle = Math.atan2(this.vel.y, this.vel.x);
    }
  }

  draw(ctx, waterHealthFactor) {
    ctx.save();
    ctx.translate(this.pos.x, this.pos.y);
    ctx.rotate(this.angle);

    const bodyColor = mixColor(
      { r: 180, g: 240, b: 255 },
      { r: 255, g: 140, b: 200 },
      1 - waterHealthFactor,
    );

    // body
    ctx.fillStyle = bodyColor;
    ctx.beginPath();
    ctx.ellipse(0, 0, this.radius, this.radius * 0.7, 0, 0, Math.PI * 2);
    ctx.fill();

    // tail
    ctx.beginPath();
    ctx.moveTo(-this.radius, 0);
    ctx.lineTo(-this.radius - 10, -8);
    ctx.lineTo(-this.radius - 10, 8);
    ctx.closePath();
    ctx.fillStyle = `rgba(0, 0, 0, 0.15)`;
    ctx.fill();

    // eye
    ctx.fillStyle = "#001018";
    ctx.beginPath();
    ctx.arc(this.radius * 0.3, -5, 3, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }
}

export class GoldenApple {
  constructor(x, y) {
    this.pos = new Vector2(x, y);
    this.radius = 13;
  }

  draw(ctx, time) {
    const bob = Math.sin(time * 3.2 + this.pos.x * 0.03) * 2.2;
    const pulse = 0.85 + Math.sin(time * 6.5) * 0.12;

    ctx.save();
    ctx.translate(this.pos.x, this.pos.y + bob);

    // glow
    const glowR = this.radius * 2.4;
    const glow = ctx.createRadialGradient(0, 0, this.radius * 0.3, 0, 0, glowR);
    glow.addColorStop(0, "rgba(255, 220, 90, 0.55)");
    glow.addColorStop(1, "rgba(255, 220, 90, 0)");
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(0, 0, glowR, 0, Math.PI * 2);
    ctx.fill();

    // apple body
    const r = this.radius * pulse;
    const body = ctx.createRadialGradient(-r * 0.2, -r * 0.2, r * 0.2, 0, 0, r);
    body.addColorStop(0, "rgba(255, 245, 200, 1)");
    body.addColorStop(1, "rgba(232, 170, 30, 1)");
    ctx.fillStyle = body;
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.fill();

    // highlight
    ctx.fillStyle = "rgba(255, 255, 255, 0.55)";
    ctx.beginPath();
    ctx.ellipse(-r * 0.25, -r * 0.25, r * 0.35, r * 0.25, -0.6, 0, Math.PI * 2);
    ctx.fill();

    // leaf
    ctx.fillStyle = "rgba(70, 200, 110, 0.95)";
    ctx.beginPath();
    ctx.ellipse(r * 0.25, -r * 0.85, r * 0.5, r * 0.22, -0.6, 0, Math.PI * 2);
    ctx.fill();

    // stem
    ctx.strokeStyle = "rgba(110, 70, 25, 0.9)";
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(0, -r * 0.65);
    ctx.lineTo(0, -r * 1.05);
    ctx.stroke();

    ctx.restore();
  }
}

export class TrashItem {
  constructor(x, y, kind, image = null) {
    this.pos = new Vector2(x, y);
    this.radius = 14;
    this.kind = kind; // 'bottle', 'bag1', 'bag2', 'can', 'net'
    this.image = image;
    this.drift = (Math.random() - 0.5) * 18;
  }

  draw(ctx, time) {
    const bob = Math.sin(time * 2 + this.pos.x * 0.02) * 2;
    ctx.save();
    ctx.translate(this.pos.x, this.pos.y + bob);

    // Prefer the actual image asset when provided + loaded.
    if (this.image && this.image.complete && this.image.naturalHeight !== 0) {
      const size = this.radius * 2.4;
      ctx.drawImage(this.image, -size / 2, -size / 2, size, size);
      ctx.restore();
      return;
    }

    switch (this.kind) {
      case "bottle":
        ctx.fillStyle = "rgba(173, 230, 255, 0.9)";
        ctx.fillRect(-4, -10, 8, 18);
        ctx.fillStyle = "rgba(210, 240, 255, 0.9)";
        ctx.fillRect(-2, -13, 4, 4);
        break;
      case "bag":
      case "bag1":
      case "bag2":
        ctx.fillStyle = "rgba(255, 255, 255, 0.85)";
        ctx.beginPath();
        ctx.moveTo(-8, -8);
        ctx.quadraticCurveTo(0, -14, 8, -8);
        ctx.lineTo(6, 8);
        ctx.quadraticCurveTo(0, 12, -6, 8);
        ctx.closePath();
        ctx.fill();
        break;
      case "can":
        ctx.fillStyle = "rgba(210, 210, 210, 0.95)";
        ctx.fillRect(-5, -9, 10, 16);
        ctx.fillStyle = "rgba(160, 160, 160, 0.95)";
        ctx.fillRect(-5, -10, 10, 3);
        break;
      case "net":
      default:
        ctx.strokeStyle = "rgba(230, 230, 230, 0.9)";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.rect(-10, -6, 20, 12);
        ctx.stroke();
        for (let i = -8; i <= 8; i += 4) {
          ctx.beginPath();
          ctx.moveTo(i, -6);
          ctx.lineTo(i + 10, 6);
          ctx.stroke();
        }
        break;
    }

    ctx.restore();
  }
}

export class PollutionCloud {
  constructor(x, y) {
    this.pos = new Vector2(x, y);
    const angle = Math.random() * Math.PI * 2;
    const speed = 20 + Math.random() * 20;
    this.vel = new Vector2(Math.cos(angle) * speed, Math.sin(angle) * speed);
    this.radius = 26 + Math.random() * 10;
  }

  update(dt, canvasWidth, canvasHeight) {
    this.pos.x += this.vel.x * dt;
    this.pos.y += this.vel.y * dt;

    // bounce softly at edges
    if (this.pos.x < this.radius || this.pos.x > canvasWidth - this.radius) {
      this.vel.x *= -1;
    }
    if (this.pos.y < this.radius || this.pos.y > canvasHeight - this.radius) {
      this.vel.y *= -1;
    }
  }

  draw(ctx, time) {
    const pulse = 0.8 + Math.sin(time * 1.5 + this.pos.x * 0.03) * 0.15;
    ctx.save();
    ctx.translate(this.pos.x, this.pos.y);
    const r = this.radius * pulse;
    const grd = ctx.createRadialGradient(0, 0, r * 0.2, 0, 0, r);
    grd.addColorStop(0, "rgba(15, 15, 15, 0.8)");
    grd.addColorStop(1, "rgba(10, 10, 10, 0)");
    ctx.fillStyle = grd;
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

export class MarineAnimal {
  constructor(x, y, kind) {
    this.pos = new Vector2(x, y);
    this.vel = new Vector2((Math.random() - 0.5) * 40, (Math.random() - 0.5) * 40);
    this.kind = kind; // 'fish', 'turtle', 'crab'
    this.radius = kind === "turtle" ? 14 : kind === "crab" ? 10 : 8;
  }

  update(dt, canvasWidth, canvasHeight) {
    // Gentle wandering
    if (Math.random() < 0.02) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 20 + Math.random() * 30;
      this.vel.x = Math.cos(angle) * speed;
      this.vel.y = Math.sin(angle) * speed;
    }

    this.pos.x += this.vel.x * dt;
    this.pos.y += this.vel.y * dt;

    const margin = 20;
    if (this.pos.x < margin || this.pos.x > canvasWidth - margin) {
      this.vel.x *= -1;
    }
    if (this.pos.y < margin || this.pos.y > canvasHeight - margin) {
      this.vel.y *= -1;
    }
  }

  draw(ctx, time) {
    ctx.save();
    ctx.translate(this.pos.x, this.pos.y);

    const wobble = Math.sin(time * 4 + this.pos.x * 0.1) * 0.4;
    ctx.rotate(wobble);

    if (this.kind === "turtle") {
      ctx.fillStyle = "#3dbb76";
      ctx.beginPath();
      ctx.ellipse(0, 0, this.radius, this.radius * 0.7, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#1c4f33";
      ctx.fillRect(-this.radius * 0.3, -this.radius * 0.1, this.radius * 0.6, this.radius * 0.2);
    } else if (this.kind === "crab") {
      ctx.fillStyle = "#ff6b6b";
      ctx.beginPath();
      ctx.arc(0, 0, this.radius, 0, Math.PI, true);
      ctx.fill();
    } else {
      // small fish
      ctx.fillStyle = "#ffd27f";
      ctx.beginPath();
      ctx.ellipse(0, 0, this.radius, this.radius * 0.6, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }
}

export class Bomb {
  constructor(x, y) {
    this.pos = new Vector2(x, y);
    this.radius = 15;
    this.image = new Image();
    this.image.src = 'Bomb-png-46599.png';
    this.lifetime = 3 + Math.random() * 4; // Random lifetime between 3-7 seconds
    this.age = 0;
  }

  update(dt, canvasWidth, canvasHeight) {
    this.age += dt;
    // Bombs are stationary but have a lifetime
    return this.age >= this.lifetime; // Return true if bomb should be removed
  }

  draw(ctx, time) {
    // Fade out as bomb ages
    const alpha = Math.max(0.3, 1 - (this.age / this.lifetime) * 0.7);
    
    ctx.save();
    ctx.translate(this.pos.x, this.pos.y);
    ctx.globalAlpha = alpha;
    
    // Draw bomb image if loaded, otherwise draw a red circle
    if (this.image.complete && this.image.naturalHeight !== 0) {
      ctx.drawImage(this.image, -this.radius, -this.radius, this.radius * 2, this.radius * 2);
    } else {
      // Fallback: draw a red circle with warning
      ctx.fillStyle = "#ff0000";
      ctx.beginPath();
      ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "#ffff00";
      ctx.lineWidth = 2;
      ctx.stroke();
    }
    
    ctx.restore();
  }
}

export function circleCollision(aPos, aRadius, bPos, bRadius) {
  const dx = aPos.x - bPos.x;
  const dy = aPos.y - bPos.y;
  const distSq = dx * dx + dy * dy;
  const r = aRadius + bRadius;
  return distSq <= r * r;
}

function clamp(v, min, max) {
  return Math.min(max, Math.max(min, v));
}

function mixColor(c1, c2, t) {
  const r = Math.round(c1.r + (c2.r - c1.r) * t);
  const g = Math.round(c1.g + (c2.g - c1.g) * t);
  const b = Math.round(c1.b + (c2.b - c1.b) * t);
  return `rgb(${r}, ${g}, ${b})`;
}
