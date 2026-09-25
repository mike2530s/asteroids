'use strict';

const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
const W = 800;
const H = 600;

// ── Input ─────────────────────────────────────────────────────────────────────
const keys = {};
const justPressed = {};

window.addEventListener('keydown', e => {
  justPressed[e.code] = !keys[e.code];
  keys[e.code] = true;
  if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code))
    e.preventDefault();
});
window.addEventListener('keyup', e => { keys[e.code] = false; });

function pressed(code) {
  const val = justPressed[code];
  justPressed[code] = false;
  return val;
}

// ── Utils ─────────────────────────────────────────────────────────────────────
const wrap  = (v, max) => ((v % max) + max) % max;
const dist  = (a, b)   => Math.hypot(a.x - b.x, a.y - b.y);
const rand  = (min, max) => min + Math.random() * (max - min);
const randInt = (min, max) => Math.floor(rand(min, max + 1));

// ── Bullet ────────────────────────────────────────────────────────────────────
class Bullet {
  constructor(x, y, angle) {
    this.x = x;
    this.y = y;
    const SPEED = 520;
    this.vx = Math.cos(angle) * SPEED;
    this.vy = Math.sin(angle) * SPEED;
    this.ttl  = 1.1;
    this.radius = 2;
    this.dead = false;
  }

  update(dt) {
    this.x = wrap(this.x + this.vx * dt, W);
    this.y = wrap(this.y + this.vy * dt, H);
    this.ttl -= dt;
    if (this.ttl <= 0) this.dead = true;
  }

  draw() {
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx.fill();
  }
}

// ── Asteroid ──────────────────────────────────────────────────────────────────
const RADII  = [0, 16, 30, 50];   // por tamaño 1, 2, 3
const SPEEDS = [0, 85, 55, 32];   // velocidad base por tamaño
const POINTS = [0, 100, 50, 20];  // puntos por tamaño

class Asteroid {
  constructor(x, y, size = 3) {
    this.x    = x;
    this.y    = y;
    this.size = size;
    this.radius = RADII[size];
    this.dead = false;

    // 15% de probabilidad de ser Estrella Fugaz (ajusta por nivel si quieres)
    const isSS = Math.random() < 0.15;
    this.isShootingStar = isSS;
    if (isSS) {
      this.shootingStarTTL = rand(4, 6);    // vida en segundos
      this.shootingStarSpeedMult = rand(25, 30) / 10; // 2.5x a 3x
      const angle = rand(0, Math.PI * 2);
      const baseSpeed = SPEEDS[size] + rand(-15, 15);
      const speed = baseSpeed * this.shootingStarSpeedMult;
      this.vx = Math.cos(angle) * speed;
      this.vy = Math.sin(angle) * speed;
    } else {
      const angle = rand(0, Math.PI * 2);
      const speed = SPEEDS[size] + rand(-15, 15);
      this.vx = Math.cos(angle) * speed;
      this.vy = Math.sin(angle) * speed;
    }
    this.rotSpeed = rand(-1.2, 1.2);
    this.rot = rand(0, Math.PI * 2);

    // Polígono irregular (estrella fugaz: forma puntiaguda/estirada)
    const n = randInt(isSS ? 6 : 8, isSS ? 8 : 13);
    this.verts = [];
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2;
      const r = this.radius * rand(0.5, isSS ? 0.8 : 1.0);
      this.verts.push([Math.cos(a) * r, Math.sin(a) * r]);
    }
  }

  update(dt) {
    // Si es estrella fugaz, decrementar TTL y auto-destruirse al expirar
    if (this.isShootingStar) {
      this.shootingStarTTL -= dt;
      if (this.shootingStarTTL <= 0) this.dead = true;
    }
    this.x   = wrap(this.x + this.vx * dt, W);
    this.y   = wrap(this.y + this.vy * dt, H);
    this.rot += this.rotSpeed * dt;
  }

  split() {
    if (this.size <= 1) return [];
    return [
      new Asteroid(this.x, this.y, this.size - 1),
      new Asteroid(this.x, this.y, this.size - 1),
    ];
  }

  draw() {
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.rot);
    
    // Diferenciador visual: Estrella Fugaz = color dorado, lineWidth 2, forma puntiaguda
    if (this.isShootingStar) {
      ctx.strokeStyle = '#ffd700';   // dorado brillante
      ctx.lineWidth   = 2;
    } else {
      ctx.strokeStyle = '#fff';
      ctx.lineWidth   = 1.5;
    }
    ctx.lineJoin    = 'round';
    
    ctx.beginPath();
    ctx.moveTo(this.verts[0][0], this.verts[0][1]);
    for (let i = 1; i < this.verts.length; i++)
      ctx.lineTo(this.verts[i][0], this.verts[i][1]);
    ctx.closePath();
    ctx.stroke();
    
    // Estela corta: 2-3 puntos atrás siguiendo la dirección
    if (this.isShootingStar) {
      ctx.lineWidth = 1;
      ctx.strokeStyle = 'rgba(255,215,0,0.5)';
      // Dibujar 2 segmentos atrás en la dirección de movimiento
      const trailPoints = 2;
      for (let i = 0; i < trailPoints; i++) {
        const t = (i + 1) / (trailPoints + 1);
        const tx = this.x - this.vx * t * 0.1; // scaled for visual
        const ty = this.y - this.vy * t * 0.1;
        ctx.beginPath();
        ctx.moveTo(tx - 3, ty);
        ctx.lineTo(tx + 3, ty);
        ctx.stroke();
      }
    }
    
    ctx.restore();
  }
}

// ── Skins ─────────────────────────────────────────────────────────────────────
const SKINS = [
  { name: 'CLASICA', stroke: '#fff',    flame: 'rgba(255,130,0,0.85)' },
  { name: 'NEON',    stroke: '#0ff',    flame: 'rgba(0,255,255,0.9)' },
  { name: 'MAGMA',   stroke: '#ff5a2a', flame: 'rgba(255,60,20,0.9)' },
  { name: 'VENENO',  stroke: '#7CFC00', flame: 'rgba(124,252,0,0.9)' },
];
const SKIN_KEY = 'asteroids-skin';
const loadSkin = () => {
  try {
    const i = parseInt(localStorage.getItem(SKIN_KEY), 10);
    return Number.isInteger(i) && SKINS[i] ? i : 0;
  } catch { return 0; }
};
const saveSkin = i => { try { localStorage.setItem(SKIN_KEY, i); } catch {} };

// ── Ship ──────────────────────────────────────────────────────────────────────
class Ship {
  constructor() { this.skin = loadSkin(); this.reset(); }

  reset() {
    this.x      = W / 2;
    this.y      = H / 2;
    this.angle  = -Math.PI / 2;
    this.vx     = 0;
    this.vy     = 0;
    this.radius = 12;
    this.thrusting     = false;
    this.invincible    = 3;
    this.shootCooldown = 0;
    this.speedBoost    = 0;
    this.shield        = 0;
    this.tripleShot    = 0;
    this.dead          = false;
  }

  update(dt) {
    if (this.dead) return;
    if (this.invincible    > 0) this.invincible    -= dt;
    if (this.shootCooldown > 0) this.shootCooldown -= dt;
    if (this.speedBoost    > 0) this.speedBoost    -= dt;
    if (this.shield        > 0) this.shield        -= dt;
    if (this.tripleShot    > 0) this.tripleShot    -= dt;

    const ROT   = 3.5;   // rad/s
    const THRUST = this.speedBoost > 0 ? 520 : 260;  // px/s² (2x con velocidad)
    const DRAG   = 0.987;

    if (keys['ArrowLeft'])  this.angle -= ROT * dt;
    if (keys['ArrowRight']) this.angle += ROT * dt;

    this.thrusting = !!keys['ArrowUp'];
    if (this.thrusting) {
      this.vx += Math.cos(this.angle) * THRUST * dt;
      this.vy += Math.sin(this.angle) * THRUST * dt;
    }

    this.vx *= DRAG;
    this.vy *= DRAG;
    this.x = wrap(this.x + this.vx * dt, W);
    this.y = wrap(this.y + this.vy * dt, H);
  }

  tryShoot() {
    if (this.shootCooldown > 0 || this.dead) return [];
    this.shootCooldown = 0.2;
    const NOSE = 21;
    const ox = this.x + Math.cos(this.angle) * NOSE;
    const oy = this.y + Math.sin(this.angle) * NOSE;
    if (this.tripleShot <= 0) return [new Bullet(ox, oy, this.angle)];
    const px = -Math.sin(this.angle);
    const py = Math.cos(this.angle);
    return [-8, 0, 8].map(off => new Bullet(ox + px * off, oy + py * off, this.angle));
  }

  draw() {
    if (this.dead) return;
    if (this.shield > 0) {
      ctx.save();
      ctx.translate(this.x, this.y);
      ctx.strokeStyle = `rgba(77,166,255,${0.6 + Math.sin(Date.now() * 0.01) * 0.25})`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, 0, this.radius + 10, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }
    // Parpadeo durante invencibilidad de reaparición
    if (this.invincible > 0 && Math.floor(this.invincible * 8) % 2 === 0) return;

    const boostActive = this.speedBoost > 0;
    const tripleActive = this.tripleShot > 0;
    const skin = SKINS[this.skin] || SKINS[0];

    // Halo cyan sutil cuando velocidad activa
    if (boostActive) {
      ctx.save();
      ctx.translate(this.x, this.y);
      ctx.strokeStyle = `rgba(0,255,255,${0.35 + Math.sin(Date.now()*0.012)*0.15})`;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(0, 0, this.radius + 6, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }
    if (tripleActive) {
      ctx.save();
      ctx.translate(this.x, this.y);
      ctx.strokeStyle = `rgba(255,0,255,${0.35 + Math.sin(Date.now()*0.012)*0.15})`;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(0, 0, this.radius + 14, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }

    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.angle);
    ctx.strokeStyle = boostActive ? '#0ff' : tripleActive ? '#f0f' : skin.stroke;
    ctx.lineWidth   = 1.5;
    ctx.lineJoin    = 'round';

    // Silueta clásica: triángulo con muesca trasera
    ctx.beginPath();
    ctx.moveTo( 20,  0);   // nariz
    ctx.lineTo(-12, -9);   // ala izquierda
    ctx.lineTo( -7,  0);   // muesca trasera
    ctx.lineTo(-12,  9);   // ala derecha
    ctx.closePath();
    ctx.stroke();

    // Llama del propulsor
    if (this.thrusting && Math.random() > 0.35) {
      ctx.beginPath();
      ctx.moveTo(-8, -4);
      ctx.lineTo(-8 - rand(6, 14), 0);
      ctx.lineTo(-8,  4);
      ctx.strokeStyle = boostActive ? 'rgba(0,255,255,0.9)' : skin.flame;
      ctx.stroke();
    }

    ctx.restore();
  }
}

// ── Partículas (explosión) ────────────────────────────────────────────────────
class Particle {
  constructor(x, y) {
    this.x  = x;
    this.y  = y;
    const angle = rand(0, Math.PI * 2);
    const speed = rand(30, 130);
    this.vx   = Math.cos(angle) * speed;
    this.vy   = Math.sin(angle) * speed;
    this.life = rand(0.4, 1.1);
    this.ttl  = this.life;
    this.dead = false;
  }

  update(dt) {
    this.x  += this.vx * dt;
    this.y  += this.vy * dt;
    this.ttl -= dt;
    if (this.ttl <= 0) this.dead = true;
  }

  draw() {
    const alpha = this.ttl / this.life;
    ctx.strokeStyle = `rgba(255,255,255,${alpha.toFixed(2)})`;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(this.x, this.y);
    ctx.lineTo(this.x - this.vx * 0.05, this.y - this.vy * 0.05);
    ctx.stroke();
  }
}

// ── Power-ups ─────────────────────────────────────────────────────────────────
class PowerUp {
  constructor(x, y, kind = 'speed') {
    this.x = x;
    this.y = y;
    this.kind = kind;
    this.radius = 14;
    this.ttl = 8;
    this.dead = false;
    this.pulse = rand(0, Math.PI * 2);
  }

  update(dt) {
    this.ttl -= dt;
    if (this.ttl <= 0) this.dead = true;
    this.pulse += dt * 4;
  }

  draw() {
    const alpha = Math.min(1, this.ttl > 1 ? 1 : this.ttl);
    const scale = 1 + Math.sin(this.pulse) * 0.12;
    if (this.kind === 'shield') {
      ctx.save();
      ctx.translate(this.x, this.y);
      ctx.scale(scale, scale);
      ctx.strokeStyle = `rgba(77,166,255,${alpha.toFixed(2)})`;
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.arc(0, 0, 12, 0, Math.PI * 2);
      ctx.stroke();
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.arc(0, 0, 7, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = `rgba(77,166,255,${(0.5 * alpha).toFixed(2)})`;
      ctx.beginPath();
      ctx.arc(0, 0, 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      return;
    }
    const col = this.kind === 'triple' ? '255,0,255' : '0,255,255';
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.scale(scale, scale);
    ctx.strokeStyle = `rgba(${col},${alpha.toFixed(2)})`;
    ctx.lineWidth = 1.8;
    ctx.lineJoin = 'round';
    // Diamante exterior
    ctx.beginPath();
    ctx.moveTo(0, -12);
    ctx.lineTo(10, 0);
    ctx.lineTo(0, 12);
    ctx.lineTo(-10, 0);
    ctx.closePath();
    ctx.stroke();
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    if (this.kind === 'triple') {
      ctx.moveTo(-5, -6);
      ctx.lineTo(-5, 6);
      ctx.moveTo(0, -6);
      ctx.lineTo(0, 6);
      ctx.moveTo(5, -6);
      ctx.lineTo(5, 6);
    } else {
      ctx.moveTo(-4, -6);
      ctx.lineTo(2, 0);
      ctx.lineTo(-4, 6);
      ctx.moveTo(1, -6);
      ctx.lineTo(7, 0);
      ctx.lineTo(1, 6);
    }
    ctx.stroke();
    // Brillo central
    ctx.fillStyle = `rgba(${col},${(0.5 * alpha).toFixed(2)})`;
    ctx.beginPath();
    ctx.arc(0, 0, 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

// ── Estado del juego ──────────────────────────────────────────────────────────
let ship, bullets, asteroids, particles, powerUps;
let score, lives, level;
let state;      // 'playing' | 'dead' | 'gameover'
let deadTimer;
let powerUpSpawnCooldown;
let shieldSpawnCooldown;

function spawnAsteroids(count) {
  const SAFE_DIST = 130;
  for (let i = 0; i < count; i++) {
    let x, y;
    do {
      x = rand(0, W);
      y = rand(0, H);
    } while (Math.hypot(x - W / 2, y - H / 2) < SAFE_DIST);
    asteroids.push(new Asteroid(x, y, 3));
  }
}

function spawnPowerUp(kind = 'speed') {
  const SAFE_DIST = 130;
  let x, y;
  do {
    x = rand(0, W);
    y = rand(0, H);
  } while (Math.hypot(x - W / 2, y - H / 2) < SAFE_DIST);
  powerUps.push(new PowerUp(x, y, kind));
}

function initGame() {
  ship          = new Ship();
  bullets   = [];
  asteroids = [];
  particles = [];
  powerUps  = [];
  score  = 0;
  lives  = 3;
  level  = 1;
  state  = 'playing';
  powerUpSpawnCooldown = rand(12, 18);
  shieldSpawnCooldown = rand(15, 22);
  spawnAsteroids(4);
}

function nextLevel() {
  level++;
  bullets   = [];
  particles = [];
  powerUps  = [];
  ship.reset();
  powerUpSpawnCooldown = rand(12, 18);
  shieldSpawnCooldown = rand(15, 22);
  spawnAsteroids(3 + level);
}

function explode(x, y, count = 8) {
  for (let i = 0; i < count; i++) particles.push(new Particle(x, y));
}

function killShip() {
  explode(ship.x, ship.y, 14);
  ship.dead = true;
  ship.speedBoost = 0;
  ship.shield = 0;
  ship.tripleShot = 0;
  lives--;
  if (lives <= 0) {
    state = 'gameover';
  } else {
    state     = 'dead';
    deadTimer = 2;
  }
}

// ── Update ────────────────────────────────────────────────────────────────────
function update(dt) {
  if (state === 'gameover') {
    if (pressed('Space')) initGame();
    particles.forEach(p => p.update(dt));
    particles = particles.filter(p => !p.dead);
    return;
  }

  if (state === 'dead') {
    deadTimer -= dt;
    particles.forEach(p => p.update(dt));
    particles = particles.filter(p => !p.dead);
    asteroids.forEach(a => a.update(dt));
    if (deadTimer <= 0) { state = 'playing'; ship.reset(); }
    return;
  }

  // Cambiar skin 1-4
  for (let i = 0; i < SKINS.length; i++) {
    if (pressed('Digit' + (i + 1)) || pressed('Numpad' + (i + 1))) {
      ship.skin = i;
      saveSkin(i);
    }
  }

  // Disparar
  if (pressed('Space')) {
    bullets.push(...ship.tryShoot());
  }

  ship.update(dt);
  bullets.forEach(b => b.update(dt));
  asteroids.forEach(a => a.update(dt));
  particles.forEach(p => p.update(dt));
  powerUps.forEach(p => p.update(dt));

  bullets   = bullets.filter(b => !b.dead);
  particles = particles.filter(p => !p.dead);
  powerUps  = powerUps.filter(p => !p.dead);

  // Spawn power-up velocidad/triple cada 12-18s
  powerUpSpawnCooldown -= dt;
  if (powerUpSpawnCooldown <= 0 && !powerUps.some(p => (p.kind === 'speed' || p.kind === 'triple') && !p.dead)) {
    spawnPowerUp(Math.random() < 0.5 ? 'speed' : 'triple');
    powerUpSpawnCooldown = rand(12, 18);
  }
  // Spawn escudo cada 15-22s
  shieldSpawnCooldown -= dt;
  if (shieldSpawnCooldown <= 0 && !powerUps.some(p => p.kind === 'shield' && !p.dead)) {
    spawnPowerUp('shield');
    shieldSpawnCooldown = rand(15, 22);
  }

  // Bala vs asteroide
  const newAsteroids = [];
  for (const b of bullets) {
    for (const a of asteroids) {
      if (!a.dead && !b.dead && dist(b, a) < a.radius) {
        b.dead = true;
        a.dead = true;
        if (a.isShootingStar) {
          score += 500;                      // bonificación alta
          explode(a.x, a.y, 12);            // partículas doradas/amarillas
          // NO dividir: split retorna []
        } else {
          score += POINTS[a.size];
          explode(a.x, a.y, a.size * 5);
          newAsteroids.push(...a.split()); // asteroides normales se parten
        }
      }
    }
  }
  asteroids = asteroids.filter(a => !a.dead).concat(newAsteroids);
  bullets   = bullets.filter(b => !b.dead);

  // Nave vs asteroide
  if (ship.invincible <= 0) {
    if (ship.shield > 0) {
      const blocked = [];
      for (const a of asteroids) {
        if (!a.dead && dist(ship, a) < ship.radius + 10 + a.radius * 0.82) {
          a.dead = true;
          if (a.isShootingStar) {
            score += 500;
            explode(a.x, a.y, 12);
          } else {
            score += POINTS[a.size];
            explode(a.x, a.y, a.size * 5);
            blocked.push(...a.split());
          }
        }
      }
      asteroids = asteroids.filter(a => !a.dead).concat(blocked);
    } else {
      for (const a of asteroids) {
        if (dist(ship, a) < ship.radius + a.radius * 0.82) {
          killShip();
          break;
        }
      }
    }
  }

  // Nave vs power-ups
  for (const p of powerUps) {
    if (!p.dead && dist(ship, p) < ship.radius + p.radius) {
      p.dead = true;
      if (p.kind === 'shield') ship.shield = 8;
      else if (p.kind === 'triple') ship.tripleShot = 5;
      else ship.speedBoost = 5;
      explode(p.x, p.y, 6);
    }
  }
  powerUps = powerUps.filter(p => !p.dead);

  // Nivel completado
  if (asteroids.length === 0) nextLevel();
}

// ── Draw ──────────────────────────────────────────────────────────────────────
function drawLifeIcon(x, y, color = '#fff') {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(-Math.PI / 2);
  ctx.strokeStyle = color;
  ctx.lineWidth   = 1.2;
  ctx.lineJoin    = 'round';
  ctx.beginPath();
  ctx.moveTo( 9,  0);
  ctx.lineTo(-6, -5);
  ctx.lineTo(-3,  0);
  ctx.lineTo(-6,  5);
  ctx.closePath();
  ctx.stroke();
  ctx.restore();
}

function drawHUD() {
  ctx.fillStyle = '#fff';
  ctx.font = '15px monospace';

  ctx.textAlign = 'left';
  ctx.fillText(`SCORE  ${score}`, 14, 26);

  ctx.textAlign = 'center';
  ctx.fillText(`NIVEL ${level}`, W / 2, 26);

  for (let i = 0; i < lives; i++)
    drawLifeIcon(W - 16 - i * 22, 18, (ship ? SKINS[ship.skin] || SKINS[0] : SKINS[0]).stroke);

  const skin = ship ? SKINS[ship.skin] || SKINS[0] : SKINS[0];
  ctx.textAlign = 'left';
  ctx.fillStyle = skin.stroke;
  ctx.font = '12px monospace';
  ctx.fillText(`SKIN [1-4] ${skin.name}`, 14, H - 14);

  let hudY = 46;
  if (ship && ship.speedBoost > 0) {
    const t = ship.speedBoost;
    ctx.fillStyle = '#0ff';
    ctx.textAlign = 'center';
    ctx.font = '13px monospace';
    ctx.fillText(`VELOCIDAD ${t.toFixed(1)}s`, W / 2, hudY);
    // Barra de duración
    const barW = 80;
    const barH = 4;
    const barX = W / 2 - barW / 2;
    const barY = hudY + 6;
    ctx.strokeStyle = 'rgba(0,255,255,0.5)';
    ctx.lineWidth = 1;
    ctx.strokeRect(barX, barY, barW, barH);
    ctx.fillStyle = '#0ff';
    ctx.fillRect(barX, barY, barW * (t / 5), barH);
    hudY += 26;
  }
  if (ship && ship.tripleShot > 0) {
    const t = ship.tripleShot;
    ctx.fillStyle = '#f0f';
    ctx.textAlign = 'center';
    ctx.font = '13px monospace';
    ctx.fillText(`TRIPLE ${t.toFixed(1)}s`, W / 2, hudY);
    const barW = 80;
    const barH = 4;
    const barX = W / 2 - barW / 2;
    const barY = hudY + 6;
    ctx.strokeStyle = 'rgba(255,0,255,0.5)';
    ctx.lineWidth = 1;
    ctx.strokeRect(barX, barY, barW, barH);
    ctx.fillStyle = '#f0f';
    ctx.fillRect(barX, barY, barW * (t / 5), barH);
    hudY += 26;
  }
  if (ship && ship.shield > 0) {
    const t = ship.shield;
    ctx.fillStyle = '#4da6ff';
    ctx.textAlign = 'center';
    ctx.font = '13px monospace';
    ctx.fillText(`ESCUDO ${t.toFixed(1)}s`, W / 2, hudY);
    const barW = 80;
    const barH = 4;
    const barX = W / 2 - barW / 2;
    const barY = hudY + 6;
    ctx.strokeStyle = 'rgba(77,166,255,0.5)';
    ctx.lineWidth = 1;
    ctx.strokeRect(barX, barY, barW, barH);
    ctx.fillStyle = '#4da6ff';
    ctx.fillRect(barX, barY, barW * (t / 8), barH);
    hudY += 26;
  }
}

function drawOverlay(title, sub) {
  ctx.textAlign   = 'center';
  ctx.fillStyle   = '#fff';
  ctx.font        = 'bold 46px monospace';
  ctx.fillText(title, W / 2, H / 2 - 18);
  ctx.font        = '18px monospace';
  ctx.fillStyle   = 'rgba(255,255,255,0.65)';
  ctx.fillText(sub, W / 2, H / 2 + 22);
}

function draw() {
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, W, H);

  particles.forEach(p => p.draw());
  asteroids.forEach(a => a.draw());
  powerUps.forEach(p => p.draw());
  bullets.forEach(b => b.draw());
  ship.draw();

  drawHUD();

  if (state === 'gameover')
    drawOverlay('GAME OVER', `PUNTAJE: ${score}   —   ESPACIO PARA REINICIAR`);
}

// ── Loop principal ────────────────────────────────────────────────────────────
let lastTime = null;

function loop(ts) {
  const dt = lastTime === null ? 0 : Math.min((ts - lastTime) / 1000, 0.05);
  lastTime = ts;
  update(dt);
  draw();
  requestAnimationFrame(loop);
}

initGame();
requestAnimationFrame(loop);
